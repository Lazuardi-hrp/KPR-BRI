import "server-only"

import { headers } from "next/headers"

import { createAnonClient } from "@/lib/supabase/anon"
import { hashIdentitas, userAgent } from "@/lib/security/identity"
import { turnstileAktif, verifikasiTurnstile } from "@/lib/security/turnstile"

/**
 * Gerbang tunggal yang dilewati setiap aksi publik.
 *
 * Urutannya disengaja:
 *   1. Kumpulkan sinyal yang HANYA server tahu (user agent, IP) dan sinyal
 *      dari klien (honeypot, lama pengisian).
 *   2. Tanya basis data — di sanalah blokir, kuota, dan riwayat tinggal.
 *   3. Bila jawabannya 'tantang' dan token Turnstile sudah ada, verifikasi
 *      lalu naikkan putusan menjadi lolos.
 *
 * Sinyal dari klien tidak pernah dipercaya untuk MERINGANKAN. Klien yang
 * berbohong ("saya mengisi 30 detik, honeypot kosong") hanya mendapat
 * perlakuan setara pengguna normal, lalu tetap tersaring oleh kuota dan
 * riwayatnya sendiri — keduanya dihitung di server dari data server.
 */

export type Aksi = "lead_submit" | "kalkulator" | "kontak" | "login" | "api_read"

export type SinyalKlien = {
  /** Kolom jebakan; terisi berarti bukan manusia. */
  honeypot?: boolean
  /** Milidetik antara formulir tampil dan dikirim. */
  elapsedMs?: number
  /** Ada ketikan/klik sungguhan di formulir. */
  interacted?: boolean
  /** Token Turnstile, bila pengguna sudah menyelesaikan tantangan. */
  turnstileToken?: string | null
}

/**
 * Mengapa sebuah permintaan ditolak.
 *
 * Dibedakan karena artinya berbeda bagi pengunjung: 'kuota' berarti coba lagi
 * sebentar lagi, 'diblokir' berarti jangan coba lagi sekarang. Menyamakan
 * keduanya — seperti sebelumnya — membuat calon pembeli sah yang kebetulan
 * melewati kuota mengira dirinya sudah diblokir, lalu pergi.
 */
export type SebabTolak = "kuota" | "diblokir" | "perilaku" | "sistem"

export type Putusan =
  | { hasil: "lolos"; skor: number }
  | { hasil: "tantang"; skor: number; turnstileTersedia: boolean }
  | {
      hasil: "tolak"
      skor: number
      sebab: SebabTolak
      pesan: string
      cobaLagiDetik: number
    }

/**
 * Kalimat yang dibaca pengunjung.
 *
 * Tidak satu pun menyebut angka batas, skor, nama aksi, atau lamanya blokir.
 * Bukan sekadar demi kerapian bahasa: memberi tahu penyerang persis berapa
 * ambangnya dan kapan ia pulih adalah menyerahkan cara menyetel serangan
 * berikutnya tepat di bawah ambang itu.
 */
const PESAN: Record<SebabTolak, string> = {
  kuota:
    "Mohon tunggu sebentar. Kami menerima terlalu banyak permintaan dalam waktu singkat. Silakan coba lagi beberapa saat lagi.",
  diblokir:
    "Akses dibatasi sementara. Kami mendeteksi aktivitas yang tidak wajar dari jaringan Anda. Silakan coba lagi nanti.",
  perilaku:
    "Pengiriman Anda belum dapat kami proses. Bila Anda mengisinya sebagai calon pembeli, silakan muat ulang halaman lalu coba sekali lagi.",
  sistem:
    "Kami sedang tidak dapat memproses permintaan ini. Silakan coba lagi beberapa saat lagi.",
}

/** Memetakan kode alasan dari guard_request ke sebab yang dipakai aplikasi. */
function keSebab(alasan: string | null | undefined): SebabTolak {
  switch (alasan) {
    case "kuota":
      return "kuota"
    case "diblokir":
      return "diblokir"
    case "perilaku":
      return "perilaku"
    default:
      // 'identitas_tidak_ada' termasuk di sini: itu kegagalan konfigurasi di
      // sisi kami, bukan kesalahan pengunjung, jadi kalimatnya pun netral.
      return "sistem"
  }
}

/**
 * Menjalankan pemeriksaan lengkap untuk satu aksi.
 *
 * `ipHash` dikembalikan agar pemanggil bisa meneruskannya ke submit_lead
 * tanpa menghitung ulang — hashing dua kali untuk permintaan yang sama hanya
 * membuang siklus dan membuka celah keduanya bisa berbeda.
 */
export async function jagaAksi(
  aksi: Aksi,
  path: string | null,
  sinyal: SinyalKlien = {},
): Promise<{ putusan: Putusan; ipHash: string; ua: string | null }> {
  const ipHash = await hashIdentitas()
  const ua = await userAgent()

  const supabase = createAnonClient()

  const { data, error } = await supabase.rpc("guard_request", {
    p_ip_hash: ipHash,
    p_action: aksi,
    p_path: path ?? undefined,
    // elapsed_ms sengaja DIHILANGKAN ketika tidak diketahui, bukan dikirim
    // sebagai 0. Nilai bawaan di dalam guard_request untuk kunci yang absen
    // adalah "sangat lama" (tidak mencurigakan); mengirim 0 justru berarti
    // "dikirim seketika" dan akan menandai pengguna sah sebagai bot.
    p_signals: {
      honeypot: sinyal.honeypot === true,
      interacted: sinyal.interacted !== false,
      ua_kosong: ua === null,
      ...(sinyal.elapsedMs != null
        ? { elapsed_ms: Math.max(0, Math.round(sinyal.elapsedMs)) }
        : {}),
    },
  })

  if (error) {
    // Penjaga yang tidak bisa dihubungi tidak boleh menjadi pintu terbuka
    // sekaligus tidak boleh mematikan situs. Aksi baca diteruskan; aksi tulis
    // ditahan, karena itulah yang benar-benar mahal bila disalahgunakan.
    const aman = aksi === "api_read" || aksi === "kalkulator"
    return {
      putusan: aman
        ? { hasil: "lolos", skor: 0 }
        : {
            hasil: "tolak",
            skor: 100,
            sebab: "sistem",
            pesan: PESAN.sistem,
            cobaLagiDetik: 60,
          },
      ipHash,
      ua,
    }
  }

  const r = (data ?? {}) as {
    putusan?: string
    skor?: number
    alasan?: string | null
    coba_lagi_detik?: number
  }
  const skor = r.skor ?? 0

  if (r.putusan === "tolak") {
    const sebab = keSebab(r.alasan)
    return {
      putusan: {
        hasil: "tolak",
        skor,
        sebab,
        pesan: PESAN[sebab],
        cobaLagiDetik: r.coba_lagi_detik ?? 60,
      },
      ipHash,
      ua,
    }
  }

  if (r.putusan === "tantang") {
    // Tantangan yang sudah dijawab pada percobaan ini langsung diselesaikan,
    // supaya pengguna tidak diminta memverifikasi dua kali berturut-turut.
    if (sinyal.turnstileToken) {
      const ipAsli = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
      const v = await verifikasiTurnstile(sinyal.turnstileToken, ipAsli)

      await supabase.rpc("record_challenge", {
        p_ip_hash: ipHash,
        p_lolos: v.lolos,
        p_action: aksi,
      })

      if (v.lolos) return { putusan: { hasil: "lolos", skor }, ipHash, ua }
    }

    return {
      putusan: { hasil: "tantang", skor, turnstileTersedia: turnstileAktif() },
      ipHash,
      ua,
    }
  }

  return { putusan: { hasil: "lolos", skor }, ipHash, ua }
}
