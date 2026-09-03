import "server-only"

import { cache } from "react"
import { z } from "zod"

import { createAnonClient } from "@/lib/supabase/anon"
import { SKEMA, type KonfigSkema, type SkemaKPR } from "@/lib/kpr"

/**
 * Parameter skema KPR yang BERLAKU.
 *
 * design.md §7.3 melarang menayangkan bunga tebakan dan menuntut angka yang
 * benar-benar berlaku di BRI. Selama angkanya dikompilasi ke dalam bundel,
 * mengoreksinya berarti menunggu deploy — dan koreksi yang menunggu deploy
 * adalah koreksi yang tertunda. Baris app_settings memindahkan keputusannya
 * ke orang yang memang berwenang atasnya.
 *
 * Awalan `public.` wajib: policy settings_read_public menyaring
 * `key like 'public.%'`, jadi nama lain tidak terbaca anon sama sekali.
 *
 * Yang TIDAK dilakukan berkas ini: melempar galat. Nilai yang hilang, rusak,
 * atau setengah jadi selalu jatuh ke SKEMA. Kalkulator yang menampilkan bunga
 * sedikit basi masih berguna; kalkulator yang menolak dirender karena satu
 * baris pengaturan salah ketik menghapus seluruh jalur konversi halaman.
 */

const ParamSchema = z.object({
  bunga: z.number().min(0).max(30),
  tenorMax: z.number().int().min(1).max(40),
  tenorDefault: z.number().int().min(1).max(40),
  dpMinPersen: z.number().min(0).max(90),
  dpDefaultPersen: z.number().min(0).max(90),
})

const KonfigRow = z.object({
  subsidi: ParamSchema.partial().optional(),
  komersial: ParamSchema.partial().optional(),
  /** ISO date. Ditampilkan di samping disclaimer sebagai "Bunga ditinjau …". */
  ditinjau_pada: z.string().optional(),
})

export type KonfigKPR = {
  skema: KonfigSkema
  /** Kapan angkanya terakhir dikonfirmasi. null bila belum pernah dicatat. */
  ditinjauPada: string | null
}

/** Cadangan yang dipakai bila baris pengaturan tidak ada atau tidak sah. */
export const KONFIG_CADANGAN: KonfigKPR = { skema: SKEMA, ditinjauPada: null }

/**
 * Dibungkus cache() dengan alasan yang sama seperti getHousingBySlug: halaman
 * detail memanggilnya dari generateMetadata dan dari komponennya, dan /simulasi
 * meneruskannya ke dua komponen anak. Satu permintaan, satu pembacaan.
 */
export const getKonfigKPR = cache(async (): Promise<KonfigKPR> => {
  const supabase = createAnonClient()

  // Tanpa .throwOnError(): kegagalan membaca pengaturan tidak boleh menjatuhkan
  // halaman yang sudah punya jawaban yang memadai.
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "public.kpr_skema")
    .maybeSingle()

  if (!data?.value) return KONFIG_CADANGAN

  const parsed = KonfigRow.safeParse(data.value)
  if (!parsed.success) return KONFIG_CADANGAN

  // Digabung per skema, bukan diganti seluruhnya: baris pengaturan hanya
  // memuat angka kebijakan. Label dan catatan tetap tinggal di kode, tempat
  // keduanya bisa ditinjau bersama kalimat lain yang tampil di layar.
  const gabung = (nama: SkemaKPR) => {
    const patch = parsed.data[nama]
    if (!patch) return SKEMA[nama]

    const digabung = { ...SKEMA[nama], ...patch }
    // Tenor bawaan yang melampaui tenor maksimum akan dijepit diam-diam oleh
    // hitungKPR dan membuat slider mulai di angka yang bukan bawaannya.
    // Lebih baik diselaraskan di sini, sekali, daripada di tiap pemakai.
    digabung.tenorDefault = Math.min(digabung.tenorDefault, digabung.tenorMax)
    digabung.dpDefaultPersen = Math.max(digabung.dpDefaultPersen, digabung.dpMinPersen)
    return digabung
  }

  return {
    skema: { subsidi: gabung("subsidi"), komersial: gabung("komersial") },
    ditinjauPada: parsed.data.ditinjau_pada ?? null,
  }
})
