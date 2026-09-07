"use server"

import { createAnonClient } from "@/lib/supabase/anon"
import { LeadSchema, HONEYPOT, VERSI_PERSETUJUAN } from "@/lib/schemas/lead"
import { jagaAksi } from "@/lib/security/guard"
import { hashSesi } from "@/lib/security/identity"
import { hitungKPR, hitungKemampuan, skemaBawaan, type SkemaKPR } from "@/lib/kpr"
import { getKonfigKPR } from "@/lib/queries/kpr"
import type { NiatWhatsApp } from "@/lib/whatsapp"

export type HasilLead =
  /**
   * `duplikat` menandai kiriman yang DIGABUNGKAN ke prospek yang sudah ada,
   * bukan yang ditolak. Kirimannya tetap berhasil — yang berbeda hanyalah
   * kalimat yang pantas ditampilkan. Memberi tahu "terkirim" untuk kelima
   * kalinya membuat pengunjung mengira ada lima pengajuan berjalan, lalu
   * menelepon untuk menanyakan yang mana yang berlaku.
   */
  | { ok: true; duplikat: boolean; ringkasan: RingkasanProspek }
  /** Butuh verifikasi tambahan sebelum kiriman diterima. */
  | { ok: false; butuhVerifikasi: true; turnstileTersedia: boolean }
  | { ok: false; butuhVerifikasi?: false; error: string }

/**
 * Yang ditampilkan ulang ke pengguna sebagai bukti kirimannya diterima.
 *
 * Sejak layar "terkirim" menawarkan melanjutkan ke WhatsApp, ringkasan ini
 * merangkap sebagai isi pesan pembuka. Karena itu ia membawa seluruh skenario
 * — bukan hanya angsurannya — dan seluruhnya berasal dari perhitungan ULANG
 * di server, bukan dari state komponen. Bila pesannya disusun dari state
 * klien, pengunjung yang menggeser slider sekali lagi setelah menekan kirim
 * akan mengirimkan skenario yang berbeda dari yang tercatat pada prospeknya,
 * dan petugas menelepon membawa dua angka yang tidak pernah bertemu.
 */
export type RingkasanProspek = {
  nama: string
  /** null bila pengunjung belum memilih perumahan (kiriman dari /simulasi). */
  perumahan: string | null
  angsuran: number | null
  tenorTahun: number | null
  harga: number | null
  uangMuka: number | null
  uangMukaPersen: number | null
  skema: SkemaKPR | null
}

export async function kirimProspek(formData: FormData): Promise<HasilLead> {
  const mentah = Object.fromEntries(formData)
  const parsed = LeadSchema.safeParse(mentah)

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian belum lengkap." }
  }
  const v = parsed.data

  // ── Lapis keamanan ────────────────────────────────────────────────────
  const { putusan, ipHash, ua } = await jagaAksi("lead_submit", v.source_page ?? null, {
    honeypot: Boolean((v[HONEYPOT] ?? "").trim()),
    elapsedMs: v.elapsed_ms,
    interacted: v.interacted === "1",
    turnstileToken: v.turnstile_token,
  })

  if (putusan.hasil === "tolak") {
    return { ok: false, error: putusan.pesan }
  }
  if (putusan.hasil === "tantang") {
    return {
      ok: false,
      butuhVerifikasi: true,
      turnstileTersedia: putusan.turnstileTersedia,
    }
  }

  const supabase = createAnonClient()

  // ── Konteks KPR, dihitung ulang di server ─────────────────────────────
  //
  // Harga diambil dari basis data, bukan dari kiriman. Ini sekaligus
  // memastikan perumahannya memang terbit sebelum apa pun disimpan.
  //
  // Sejak /simulasi ada, perumahan boleh tidak dipilih sama sekali: seseorang
  // yang baru menghitung kemampuannya belum tentu sudah menemukan rumahnya,
  // dan memaksanya memilih satu hanya untuk bisa dihubungi akan membuang
  // prospek yang paling awal. Tanpa perumahan berarti tanpa harga, jadi tanpa
  // estimasi angsuran — bukan estimasi nol.
  let perumahan: { name: string | null; price_min: number | null } | null = null

  if (v.housing_id) {
    const { data } = await supabase
      .from("v_housing_public")
      .select("name, price_min")
      .eq("id", v.housing_id)
      .maybeSingle()

    if (!data) {
      return { ok: false, error: "Perumahan ini sedang tidak tersedia." }
    }
    perumahan = data
  }

  const harga = perumahan?.price_min ?? null
  const { skema: konfig } = await getKonfigKPR()
  let estimasi: ReturnType<typeof hitungKPR> | null = null
  let skemaTerpakai: SkemaKPR | null = null

  if (harga != null && harga > 0) {
    skemaTerpakai = v.skema ?? skemaBawaan(harga)
    estimasi = hitungKPR({
      harga,
      skema: skemaTerpakai,
      uangMukaPersen: v.dp_persen ?? konfig[skemaTerpakai].dpDefaultPersen,
      tenorTahun: v.tenor_years ?? konfig[skemaTerpakai].tenorDefault,
      konfig,
    })
  }

  // ── Band kemampuan, juga dihitung ulang ───────────────────────────────
  //
  // Penghasilan memang hanya bisa datang dari pengunjung — tidak ada sumber
  // pembanding. Tetapi KESIMPULANNYA tidak diterima dari klien: band disusun
  // di sini dari penghasilan yang dikirim dan angsuran yang baru saja dihitung
  // ulang dari harga tersimpan. Kalau tidak, siapa pun bisa menuliskan "aman"
  // ke dasbor petugas lewat DevTools, dan petugas akan menelepon dengan
  // gambaran kapasitas yang dikarang.
  //
  // Tanpa perumahan, angsuran belum ada; yang dinilai adalah kapasitas penuh
  // pengunjung — yang menurut definisinya persis menyentuh batas, jadi band
  // ditahan null alih-alih melaporkan "aman" untuk sesuatu yang belum diukur.
  const kemampuan =
    v.monthly_income && v.monthly_income > 0 && estimasi && skemaTerpakai
      ? hitungKemampuan({
          penghasilan: v.monthly_income,
          komitmen: v.monthly_commitments,
          skema: skemaTerpakai,
          tenorTahun: estimasi.tenorTahun,
          uangMukaPersen: estimasi.uangMukaPersen,
          angsuran: estimasi.angsuranBulanan,
          konfig,
        })
      : null

  const { data: hasilKirim, error } = await supabase.rpc("submit_lead", {
    // null eksplisit, bukan undefined. p_housing_id mendahului parameter wajib
    // sehingga tidak boleh punya nilai bawaan di sisi SQL; menghilangkannya
    // dari kiriman membuat PostgREST gagal mencocokkan tanda tangannya sama
    // sekali ("function does not exist"), bukan mengisinya dengan null.
    p_housing_id: v.housing_id ?? null,
    p_name: v.name,
    p_phone: v.phone,
    p_email: v.email ?? undefined,
    p_message: v.message ?? undefined,
    p_consent_version: VERSI_PERSETUJUAN,
    p_ip_hash: ipHash,
    p_user_agent: ua ?? undefined,
    p_lead_kind: v.lead_kind,
    p_source_page: v.source_page ?? undefined,
    p_price_snapshot: harga ?? undefined,
    p_est_monthly_payment: estimasi?.angsuranBulanan,
    p_down_payment: estimasi?.uangMuka,
    p_tenor_years: estimasi?.tenorTahun,
    p_interest_rate: estimasi?.bungaPersen,
    p_risk_score: putusan.skor,
    p_monthly_income: v.monthly_income,
    p_monthly_commitments: v.monthly_commitments,
    p_affordability_band: kemampuan?.band,
  })

  if (error) {
    // submit_lead sudah memakai bahasa Indonesia untuk galat yang ditujukan
    // ke pengguna, tetapi pesannya tetap tidak diteruskan mentah-mentah:
    // isi pesan basis data bukan sesuatu yang boleh sampai ke browser.
    if (error.code === "P0001")
      return {
        ok: false,
        error: "Terlalu banyak pengajuan dari jaringan ini. Coba lagi dalam satu jam.",
      }
    if (error.code === "P0002") return { ok: false, error: "Perumahan ini sedang tidak tersedia." }
    return { ok: false, error: "Gagal mengirim. Coba beberapa saat lagi." }
  }

  // Peristiwa analitik, SETELAH prospeknya benar-benar tersimpan.
  //
  // Ditulis di server, jadi ia tidak bisa dipalsukan dari peramban dan tidak
  // bisa hilang karena pemblokir iklan — dua hal yang membuat tahap terbawah
  // corong justru yang paling rawan bila hanya mengandalkan suar.
  //
  // Id sesi diambil dari bidang tersembunyi formulir, bukan dari LeadSchema:
  // ia bukan data prospek, hanya penghubung ke sesi peramban supaya tahap ini
  // sebanding dengan tahap-tahap di atasnya, yang semuanya dihitung per sesi.
  // Bila bidangnya tidak ada, peristiwanya tetap dicatat tanpa sesi —
  // faktanya nyata sekalipun kaitannya hilang.
  const sesiMentah = formData.get("sesi")
  try {
    await supabase.rpc("record_event", {
      p_housing_id: v.housing_id ?? null,
      p_kind: "submit_lead",
      p_session: typeof sesiMentah === "string" && sesiMentah ? hashSesi(sesiMentah) : null,
      p_referrer: null,
    })
  } catch {
    // Prospeknya sudah tersimpan. Kehilangan satu baris analitik tidak boleh
    // mengubah jawaban yang diterima pengunjung menjadi kegagalan.
  }

  return {
    ok: true,
    duplikat: (hasilKirim as { duplikat?: boolean } | null)?.duplikat === true,
    ringkasan: {
      nama: v.name,
      perumahan: perumahan?.name ?? null,
      angsuran: estimasi?.angsuranBulanan ?? null,
      tenorTahun: estimasi?.tenorTahun ?? null,
      harga: harga,
      uangMuka: estimasi?.uangMuka ?? null,
      uangMukaPersen: estimasi?.uangMukaPersen ?? null,
      skema: skemaTerpakai,
    },
  }
}

/**
 * Mencatat niat menghubungi lewat WhatsApp.
 *
 * Dipanggil tepat sebelum jendela WhatsApp dibuka. Sengaja TIDAK membuat
 * prospek: pada titik ini belum ada nama, nomor, apalagi persetujuan UU PDP —
 * menyimpan orangnya tanpa itu justru melanggar hal yang sedang dijaga.
 * Yang dicatat hanyalah peristiwanya, tanpa data pribadi, supaya admin tetap
 * melihat perumahan mana yang menarik minat lewat jalur ini.
 *
 * Jalur yang MEMANG menjadi prospek adalah formulir yang dikirim dengan
 * lead_kind 'whatsapp' — di sana nama, nomor, dan persetujuan sudah ada, dan
 * WhatsApp hanyalah kanal lanjutannya. Dua jalur ini sengaja tidak dilebur:
 * yang satu peristiwa tanpa orang, yang lain orang yang memberi izin.
 */
export async function catatKontakWhatsApp(
  /**
   * Perumahan yang bersangkutan, atau null.
   *
   * null bukan kelalaian melainkan keadaan yang sah: pertanyaan dari
   * /simulasi sebelum ada perumahan dipilih, dan bantuan umum, memang tidak
   * menyangkut perumahan mana pun. record_event menerima null; mengarang
   * sebuah id di sana akan menaruh minat pada perumahan yang tidak pernah
   * dibuka siapa pun, lalu mengangkatnya di daftar properti terpopuler.
   */
  housingId: string | null,
  /**
   * Id sesi peramban (idSesiPublik di src/components/jejak.ts).
   *
   * Wajib diteruskan, bukan opsional demi kenyamanan: corong menghitung sesi
   * yang berbeda di setiap tahap, dan peristiwa tanpa session_hash tidak
   * pernah ikut terhitung oleh count(distinct ...). Tanpa parameter ini tahap
   * "kontak" menampilkan nol selamanya meskipun barisnya ada di tabel.
   */
  sesi: string | null,
  /**
   * Niat yang diklik. Tidak ikut tersimpan di housing_events — tabel itu tidak
   * punya kolomnya — melainkan diteruskan sebagai `path` ke guard_request,
   * yang mencatatnya pada abuse_events. Di sanalah gunanya: ketika satu
   * identitas menembakkan ratusan klik kontak, /admin/keamanan menunjukkan
   * tombol mana yang dipakai alih-alih 'whatsapp' untuk semuanya.
   */
  niat: NiatWhatsApp = "properti",
): Promise<void> {
  const { putusan } = await jagaAksi("kontak", `whatsapp:${niat}`, {})
  if (putusan.hasil === "tolak") return

  const supabase = createAnonClient()
  // Lewat record_event(), bukan INSERT langsung: migrasi 0022 mencabut hak
  // INSERT anon pada housing_events supaya kunci anon yang ikut terkirim ke
  // peramban tidak bisa dipakai mengarang baris analitik.
  await supabase.rpc("record_event", {
    p_housing_id: housingId,
    p_kind: "click_kontak",
    p_session: sesi ? hashSesi(sesi) : null,
    p_referrer: null,
  })
}
