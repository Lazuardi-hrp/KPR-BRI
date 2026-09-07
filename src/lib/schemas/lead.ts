import { z } from "zod"

/**
 * Validasi formulir minat.
 *
 * Batasan yang sama ditegakkan ulang oleh basis data (leads_name_ck,
 * leads_phone_ck) — ini lapis yang memberi pesan enak dibaca, bukan
 * satu-satunya penjaga.
 */

/** Nama kolom jebakan. Disembunyikan dari mata dan dari pembaca layar. */
export const HONEYPOT = "website"

/**
 * Teks persetujuan dan versinya, bersebelahan dengan sengaja.
 *
 * Sebelumnya teksnya tinggal di komponen dan versinya di Server Action, dua
 * berkas yang tidak pernah dibuka bersamaan. Begitu kalkulator mulai
 * menanyakan penghasilan, teks yang tidak menyebutnya akan tetap tersimpan
 * sebagai "v1" — jejak persetujuan yang mencatat versi salah lebih buruk
 * daripada tidak mencatat sama sekali, karena ia tampak sah.
 *
 * Keduanya WAJIB berubah bersama. Menaikkan versi tanpa mengubah teks, atau
 * sebaliknya, membuat kolom consent_version berbohong tentang apa yang
 * sebenarnya disetujui orang.
 *
 * Nilai yang sama juga diseed ke app_settings `public.consent_version`
 * (migrasi 0019) agar terlihat admin tanpa membaca kode.
 */
export const VERSI_PERSETUJUAN = "v2"

export const TEKS_PERSETUJUAN =
  "Saya bersedia dihubungi oleh petugas BRI atau pengembang perumahan terkait " +
  "informasi KPR bersubsidi untuk perumahan yang saya pilih. Data saya (nama, " +
  "nomor telepon, email, serta penghasilan dan cicilan bulanan yang saya isikan " +
  "pada simulasi) digunakan hanya untuk keperluan tersebut, tidak dibagikan " +
  "kepada pihak lain, dan dapat saya minta hapus kapan saja melalui kontak yang " +
  "tertera. Angka simulasi bukan penilaian kelayakan kredit."

const kosongJadiUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional())

export const LeadSchema = z.object({
  // Opsional sejak /simulasi ada: pengunjung boleh meminta dihubungi sebelum
  // memilih perumahan. submit_lead memang sudah menangani housing null
  // (`if p_housing_id is not null`) dan memberi notifikasi "Tanpa perumahan";
  // yang berubah di sini hanyalah lapisan aplikasi menyusul basis datanya.
  housing_id: kosongJadiUndefined(z.string().uuid("Perumahan tidak dikenali")),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+][0-9 ()+-]{7,19}$/, "Nomor telepon tidak valid. Contoh: 0812 3456 7890"),
  email: kosongJadiUndefined(z.string().email("Format email tidak valid")),
  message: kosongJadiUndefined(z.string().trim().max(1000, "Pesan maksimal 1000 karakter")),

  // Checkbox persetujuan. UU PDP mensyaratkan tindakan afirmatif — nilai
  // bawaannya tidak tercentang, dan tanpa centang ini pengiriman ditolak.
  consent: z.literal("on", { message: "Persetujuan wajib dicentang sebelum mengirim" }),

  // ── Asal prospek ────────────────────────────────────────────────────
  lead_kind: z
    .enum(["form_minat", "kalkulator", "ajukan_kpr", "minta_info", "whatsapp"])
    .default("form_minat"),
  source_page: kosongJadiUndefined(z.string().trim().max(120)),

  // ── Konteks simulasi KPR ────────────────────────────────────────────
  //
  // Yang dikirim klien hanyalah PILIHANNYA (skema, uang muka, tenor), tidak
  // pernah angka hasilnya. Harga dan angsuran dihitung ulang di server dari
  // harga yang tersimpan — kalau tidak, siapa pun bisa menyuntikkan
  // "angsuran Rp 1" ke dasbor admin lewat DevTools.
  skema: z.enum(["subsidi", "komersial"]).optional(),
  dp_persen: z.coerce.number().min(0).max(90).optional(),
  tenor_years: z.coerce.number().int().min(1).max(30).optional(),

  // Penghasilan dan cicilan lain, dilaporkan sendiri di kalkulator.
  //
  // Berbeda dari harga: angka ini memang HANYA bisa datang dari pengunjung,
  // tidak ada sumber lain yang bisa dipakai membandingkan. Yang tetap tidak
  // diterima dari klien adalah KESIMPULANNYA — band kemampuan dihitung ulang
  // di server dari angka ini dan harga tersimpan, supaya tidak ada yang bisa
  // mengirim "aman" ke dasbor petugas lewat DevTools.
  //
  // Batas atasnya sengaja terhingga: satu miliar per bulan jelas salah ketik,
  // dan membiarkannya lolos hanya menghasilkan harga maksimum yang tidak bisa
  // dibaca manusia. Basis data menegakkan batas yang sama (leads_income_ck).
  monthly_income: kosongJadiUndefined(z.coerce.number().min(0).max(1_000_000_000)),
  monthly_commitments: kosongJadiUndefined(z.coerce.number().min(0).max(1_000_000_000)),

  // ── Sinyal anti-bot ─────────────────────────────────────────────────
  [HONEYPOT]: z.string().optional(),
  elapsed_ms: z.coerce.number().int().min(0).max(86_400_000).optional(),
  interacted: z.string().optional(),
  turnstile_token: kosongJadiUndefined(z.string().max(4096)),
})

export type LeadInput = z.infer<typeof LeadSchema>
