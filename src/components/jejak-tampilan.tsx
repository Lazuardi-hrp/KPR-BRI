"use client"

import { useEffect, useRef } from "react"

import { catatPeristiwa } from "@/components/jejak"
import type { JenisPeristiwa } from "@/lib/schemas/event"

/**
 * Pencatat peristiwa saat komponen terpasang. Tidak merender apa pun.
 *
 * Dipakai untuk dua tahap teratas corong — keduanya terjadi tanpa ada yang
 * diklik, jadi keduanya butuh pemicu berbasis pemasangan komponen alih-alih
 * penangan peristiwa.
 *
 * KENAPA ADA LATCH useRef
 * React StrictMode di development memasang, membongkar, lalu memasang ulang
 * setiap komponen sekali. Tanpa latch, setiap tampilan halaman tercatat dua
 * kali selama pengembangan — dan karena angkanya masih kecil pada tahap awal,
 * penggandaan itu justru paling sulit disadari tepat ketika ia paling
 * merusak kepercayaan pada dasbor yang baru dibuat.
 *
 * Dedupe per sesi di jejak.ts sebenarnya sudah menangkap ini. Latch di sini
 * adalah lapis kedua yang berdiri bahkan ketika sessionStorage ditolak
 * peramban, karena pada kasus itu jejak.ts jatuh ke memoriCadangan yang
 * ikut hilang bersama komponennya.
 */
function Jejak({ kind, housingId }: { kind: JenisPeristiwa; housingId?: string | null }) {
  const sudah = useRef(false)

  useEffect(() => {
    if (sudah.current) return
    sudah.current = true
    catatPeristiwa(kind, housingId)
  }, [kind, housingId])

  return null
}

/**
 * Satu baris per sesi peramban, dipasang di layout akar.
 *
 * Inilah tahap teratas corong. Tanpanya "pengunjung" hanya bisa diturunkan
 * dari orang yang kebetulan membuka halaman detail, sehingga setiap orang
 * yang mendarat lalu pergi tidak pernah terhitung — dan tingkat kebocoran
 * pertama, yang paling mahal, tidak pernah terlihat.
 */
export function JejakKunjungan() {
  return <Jejak kind="kunjungan" housingId={null} />
}

/**
 * Satu baris per perumahan yang dibuka pada sesi ini.
 *
 * Halaman detail adalah SSG + ISR: pada cache hit ia tidak pernah menyentuh
 * server, jadi ini satu-satunya tempat tampilannya bisa dicatat.
 */
export function JejakTampilan({ housingId }: { housingId: string }) {
  return <Jejak kind="view_detail" housingId={housingId} />
}
