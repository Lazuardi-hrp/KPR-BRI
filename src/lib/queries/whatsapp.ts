import "server-only"

import { cache } from "react"
import { z } from "zod"

import { createAnonClient } from "@/lib/supabase/anon"
import { nomorWa, type KontakWhatsApp } from "@/lib/whatsapp"

export type { KontakWhatsApp }

/**
 * Nomor WhatsApp pusat tim KPR.
 *
 * Berbeda dari nomor pada tiap perumahan, yang merupakan kontak pemasaran
 * pengembang. Nomor ini menjawab pertanyaan yang belum punya perumahan:
 * seseorang di /simulasi yang baru tahu anggarannya, atau siapa pun yang
 * sekadar ingin tahu harus mulai dari mana. Sebelum ini pertanyaan seperti itu
 * tidak punya tujuan sama sekali — tombol WhatsApp hanya muncul ketika sebuah
 * perumahan sudah dipilih, padahal justru orang yang belum memilih yang paling
 * butuh diajak bicara.
 *
 * Hidup di app_settings, mengikuti pola public.kpr_skema (migrasi 0019):
 * nomor petugas berganti jauh lebih sering daripada kode di-deploy, dan nomor
 * yang menunggu deploy adalah nomor yang mati.
 *
 * Awalan `public.` wajib — policy settings_read_public menyaring
 * `key like 'public.%'`, jadi nama lain tidak terbaca anon sama sekali.
 */

const BarisKontak = z.object({
  nomor: z.string().nullish(),
  label: z.string().max(120).nullish(),
  /** Jam layanan, ditampilkan apa adanya di samping tombol. */
  jam: z.string().max(120).nullish(),
})

const LABEL_BAWAAN = "Tim KPR BRI Pematang Siantar"

/**
 * null berarti "belum diatur", dan pemanggil WAJIB memperlakukannya sebagai
 * perintah untuk tidak merender apa pun. Sikapnya sama dengan email kontak
 * pada housing-popup.tsx: lebih baik tidak ada barisnya daripada tombol yang
 * mendarat di percakapan kosong dengan nomor yang tidak ada pemiliknya.
 */
export const getKontakWhatsApp = cache(async (): Promise<KontakWhatsApp | null> => {
  const supabase = createAnonClient()

  // Tanpa .throwOnError(), dengan alasan yang sama seperti getKonfigKPR:
  // pengaturan yang gagal dibaca tidak boleh menjatuhkan halaman yang masih
  // punya seluruh isinya.
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "public.whatsapp")
    .maybeSingle()

  const parsed = data?.value ? BarisKontak.safeParse(data.value) : null

  // Env dipakai sebagai cadangan, bukan sebaliknya: baris pengaturan bisa
  // dikoreksi tim BRI sendiri, env hanya bisa diubah oleh yang memegang
  // deployment. Yang bisa dikoreksi lebih cepat yang menang.
  const mentah = parsed?.success ? parsed.data.nomor : null
  const nomor = nomorWa(mentah ?? process.env.NEXT_PUBLIC_WHATSAPP_KPR ?? null)
  if (!nomor) return null

  return {
    nomor,
    label: (parsed?.success ? parsed.data.label?.trim() : null) || LABEL_BAWAAN,
    jam: (parsed?.success ? parsed.data.jam?.trim() : null) || null,
  }
})
