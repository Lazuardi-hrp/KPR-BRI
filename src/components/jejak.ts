"use client"

import { JENIS_DARI_KLIEN, MAKS_RUJUKAN, type JenisPeristiwa } from "@/lib/schemas/event"

/**
 * Suar analitik sisi peramban.
 *
 * Tiga aturan yang tidak boleh dilanggar berkas ini:
 *
 *   1. TIDAK PERNAH melempar. Dipanggil dari onClick tombol WhatsApp dan dari
 *      useEffect halaman detail; sebuah galat di sini akan menjatuhkan
 *      interaksi yang sedang berlangsung. Semua yang bisa gagal —
 *      sessionStorage yang ditolak di mode privat, sendBeacon yang tidak ada,
 *      JSON yang tidak terbentuk — berakhir sebagai `return`, bukan `throw`.
 *   2. TIDAK PERNAH menunggu. sendBeacon menyerahkan permintaan ke peramban
 *      dan kembali seketika; ia bahkan selamat ketika halaman dibongkar di
 *      detik yang sama. Tidak ada `await` di jalur pengguna.
 *   3. TIDAK PERNAH memungut data pribadi. Yang keluar hanya jenis peristiwa,
 *      id perumahan, nilai acak sesi, dan ASAL perujuk.
 */

const KUNCI_SESI = "kpr.jejak.sesi"
const AWALAN_SEKALI = "kpr.jejak.sekali."

/**
 * Cadangan ketika sessionStorage tidak bisa dipakai sama sekali (mode privat
 * Safari lama, peramban dengan penyimpanan situs dimatikan). Dedupe tetap
 * berlaku selama halaman hidup, yang sudah menangkap kasus paling sering:
 * StrictMode dan render ulang beruntun.
 */
const memoriCadangan = new Set<string>()
let sesiCadangan: string | null = null

function bacaSimpanan(kunci: string): string | null {
  try {
    return window.sessionStorage.getItem(kunci)
  } catch {
    return null
  }
}

function tulisSimpanan(kunci: string, nilai: string): void {
  try {
    window.sessionStorage.setItem(kunci, nilai)
  } catch {
    // Diabaikan: memoriCadangan yang mengambil alih.
  }
}

/**
 * Pengenal sesi — nilai acak, bukan turunan apa pun tentang orangnya.
 *
 * Hidup di sessionStorage, jadi ia mati ketika tab ditutup dan tidak pernah
 * menjadi pengenal lintas kunjungan. Server meng-hash-nya lagi dengan garam
 * sebelum menyimpan (lihat hashSesi di src/lib/security/identity.ts), jadi
 * nilai yang ada di sini dan nilai yang ada di basis data tidak bisa
 * dicocokkan tanpa memegang garam server.
 */
function idSesi(): string {
  const tersimpan = bacaSimpanan(KUNCI_SESI)
  if (tersimpan) return tersimpan
  if (sesiCadangan) return sesiCadangan

  const baru =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

  sesiCadangan = baru
  tulisSimpanan(KUNCI_SESI, baru)
  return baru
}

/**
 * Asal perujuk, atau null.
 *
 * Hanya skema + host. URL penuh dari situs lain bisa membawa string kueri
 * berisi token atau alamat surel milik orang yang bahkan bukan pengunjung
 * kita; memungutnya berarti menyimpan data pribadi pihak ketiga tanpa dasar
 * apa pun. Rujukan dari dalam situs sendiri dibuang — ia bukan "dari mana
 * mereka datang", hanya halaman sebelumnya.
 */
function asalRujukan(): string | null {
  try {
    const ref = document.referrer
    if (!ref) return null
    const u = new URL(ref)
    if (u.origin === window.location.origin) return null
    return u.origin.slice(0, MAKS_RUJUKAN)
  } catch {
    return null
  }
}

/** Sudah pernah dicatat pada sesi ini? Sekaligus menandainya bila belum. */
function sekaliSaja(kunci: string): boolean {
  const penuh = AWALAN_SEKALI + kunci
  if (memoriCadangan.has(penuh)) return false
  if (bacaSimpanan(penuh)) {
    memoriCadangan.add(penuh)
    return false
  }
  memoriCadangan.add(penuh)
  tulisSimpanan(penuh, "1")
  return true
}

/**
 * Mencatat satu peristiwa. Aman dipanggil berkali-kali.
 *
 * DEDUPE PER SESI, disengaja. Seseorang yang memuat ulang halaman detail
 * sepuluh kali tidak menaruh sepuluh kali lipat minat pada perumahan itu, dan
 * tombol "kembali" pada peramban membuat pola itu biasa, bukan langka.
 * Karena itu "tampilan properti" berarti properti yang DIBUKA pada sesi ini,
 * bukan jumlah pemuatan halaman — angka yang lebih sulit digelembungkan oleh
 * perilaku menelusuri yang wajar, dan diberi label demikian di dasbor.
 *
 * Dedupe ini juga yang menahan pemanggilan ganda React StrictMode di
 * development; latch di jejak-tampilan.tsx adalah lapis keduanya.
 */
export function catatPeristiwa(kind: JenisPeristiwa, housingId?: string | null): void {
  try {
    if (typeof window === "undefined") return
    if (!JENIS_DARI_KLIEN.includes(kind)) return

    // Petugas yang sedang bekerja bukan pengunjung.
    //
    // Layout akar membungkus /admin juga, jadi tanpa baris ini setiap admin
    // yang membuka dasbornya sendiri akan tercatat sebagai kunjungan — dan
    // dasbor yang paling sering dibuka justru pada hari-hari sepi akan
    // menampilkan kenaikan yang seluruhnya berasal dari orang yang sedang
    // menatapnya. Penjagaan diletakkan di sini, bukan di komponen pemanggil,
    // supaya halaman publik baru tidak perlu mengingat-ingat aturan ini.
    if (window.location.pathname.startsWith("/admin")) return

    if (!sekaliSaja(`${kind}:${housingId ?? "-"}`)) return

    const muatan = JSON.stringify({
      kind,
      housingId: housingId ?? null,
      session: idSesi(),
      referrer: asalRujukan(),
    })

    // Blob dengan tipe eksplisit: sendBeacon tanpa itu mengirim
    // Content-Type: text/plain, dan request.json() di route handler menolak
    // memparsinya. Kegagalan ini tidak terlihat di mana pun — permintaannya
    // berangkat, dijawab 204, dan tidak satu baris pun tertulis.
    const blob = new Blob([muatan], { type: "application/json" })

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/peristiwa", blob)
      return
    }

    // Cadangan untuk peramban tanpa sendBeacon. keepalive menjaga permintaan
    // tetap hidup melewati navigasi, yang persis kasus tombol WhatsApp.
    void fetch("/api/peristiwa", {
      method: "POST",
      body: blob,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analitik tidak pernah menghalangi apa pun. Lihat aturan 1 di atas.
  }
}

/**
 * Id sesi untuk komponen klien yang mencatat lewat Server Action, bukan lewat
 * suar.
 *
 * Dibutuhkan karena corong menghitung SESI YANG BERBEDA di setiap tahap.
 * Peristiwa yang ditulis server tanpa id sesi masuk dengan session_hash null,
 * dan `count(distinct session_hash)` tidak pernah menghitung null — tahap
 * "kontak" pada corong akan menunjukkan nol selamanya sementara barisnya
 * jelas-jelas ada di tabel. Kegagalan diam yang paling mahal: datanya benar,
 * grafiknya bohong.
 */
export function idSesiPublik(): string | null {
  try {
    if (typeof window === "undefined") return null
    return idSesi()
  } catch {
    return null
  }
}
