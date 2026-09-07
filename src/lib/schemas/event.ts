import { z } from "zod"

/**
 * Bentuk satu peristiwa analitik — SATU sumber untuk peramban dan server.
 *
 * Seperti schemas/image.ts, berkas ini sengaja tidak mengimpor apa pun dari
 * sisi server supaya jejak.ts boleh memakainya di peramban. Yang divalidasi
 * di peramban hanyalah demi tidak mengirim sampah; yang MENENTUKAN adalah
 * pemeriksaan ulang di route handler.
 */

/**
 * Jenis yang boleh datang dari peramban.
 *
 * Sengaja LEBIH SEMPIT daripada enum event_type di basis data. 'click_kontak'
 * dan 'submit_lead' hanya ditulis dari Server Action, setelah tindakan yang
 * bersangkutan benar-benar berhasil di server. Membiarkan keduanya lewat
 * suar publik berarti siapa pun bisa menembakkan 'submit_lead' ribuan kali
 * dan membuat dasar corong — bagian yang justru dipakai menilai keberhasilan
 * kanal — menjadi angka karangan. Yang paling penting dijaga adalah tahap
 * yang paling menggoda untuk dipalsukan.
 */
export const JENIS_DARI_KLIEN = [
  "kunjungan",
  "view_detail",
  "pakai_kalkulator",
  "click_peta",
] as const

export type JenisPeristiwa = (typeof JENIS_DARI_KLIEN)[number]

/** Panjang maksimum pengenal sesi; dipangkas lagi oleh record_event(). */
export const MAKS_SESI = 64

/** Panjang maksimum asal perujuk. */
export const MAKS_RUJUKAN = 200

export const EventSchema = z.object({
  kind: z.enum(JENIS_DARI_KLIEN),
  /**
   * Boleh kosong: 'kunjungan' terjadi sebelum pengunjung membuka perumahan
   * mana pun, dan memaksakan sebuah id di sana hanya akan mengarang atribusi.
   */
  housingId: z.string().uuid().nullish(),
  session: z.string().min(1).max(MAKS_SESI),
  /**
   * Hanya ASAL (skema + host), tidak pernah URL penuh. URL penuh dari situs
   * lain bisa membawa string kueri berisi token atau alamat surel milik orang
   * yang bahkan bukan pengunjung kita. record_event() menolak apa pun yang
   * tidak berbentuk asal, jadi ini lapis pertama dari dua.
   */
  referrer: z.string().max(MAKS_RUJUKAN).nullish(),
})

export type MuatanPeristiwa = z.infer<typeof EventSchema>
