import { NextResponse } from "next/server"
import { z } from "zod"

import { jagaAksi } from "@/lib/security/guard"

/**
 * Pencarian alamat untuk filter jarak di /map — perantara ke Nominatim.
 *
 * KENAPA LEWAT SERVER, BUKAN LANGSUNG DARI PERAMBAN
 * Tiga alasan yang berdiri sendiri-sendiri:
 *
 *   1. CSP. `connect-src` di next.config.ts memuat Supabase dan Vercel saja.
 *      Memanggil nominatim.openstreetmap.org dari peramban menuntut host baru
 *      di sana — pelonggaran permanen pada halaman yang juga memuat formulir
 *      prospek. Panggilan seasal tidak menuntut perubahan apa pun.
 *   2. Ketentuan pemakaian Nominatim menuntut User-Agent yang mengidentifikasi
 *      aplikasi dan membatasi 1 permintaan per detik. Keduanya hanya bisa
 *      ditegakkan di sisi yang kita kendalikan; peramban bahkan tidak
 *      diizinkan menyetel User-Agent.
 *   3. Kuota. jagaAksi("api_read") sudah punya ambangnya di
 *      app_settings.rate_limits, jadi rute ini ikut terlindung tanpa migrasi
 *      dan tanpa nilai Aksi baru.
 *
 * Bentuknya meniru /api/peristiwa: pemeriksaan asal, validasi zod, penjaga,
 * lalu kegagalan yang meluruh menjadi hasil kosong. Bedanya satu — di sini
 * pemanggilnya MEMBACA jawaban, jadi rute ini tidak bisa selalu 204.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const KOSONG = { hasil: [] as Titik[] }

/** Cukup jauh untuk mencakup Simalungun sekitarnya, cukup ketat untuk menahan
 *  "Jalan Merdeka" dari menjawab dengan Jakarta. Urutan Nominatim:
 *  <bujur kiri>,<lintang atas>,<bujur kanan>,<lintang bawah>. */
const KOTAK_SIANTAR = "98.5,3.6,99.7,2.4"

const Kueri = z.object({
  q: z.string().trim().min(3).max(120),
})

type Titik = { lat: number; lng: number; label: string }

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    // Route handler tidak mendapat pemeriksaan asal bawaan seperti Server
    // Action; satu baris ini menutup pemakaian rute ini sebagai perantara
    // Nominatim terbuka oleh situs lain.
    const asal = request.headers.get("origin")
    if (asal && asal !== url.origin) return NextResponse.json(KOSONG)

    const kueri = Kueri.safeParse({ q: url.searchParams.get("q") ?? "" })
    if (!kueri.success) return NextResponse.json(KOSONG)

    const { putusan } = await jagaAksi("api_read", "/api/geokode", {})
    if (putusan.hasil !== "lolos") return NextResponse.json(KOSONG, { status: 429 })

    const cari = new URL("https://nominatim.openstreetmap.org/search")
    cari.searchParams.set("q", kueri.data.q)
    cari.searchParams.set("format", "jsonv2")
    cari.searchParams.set("countrycodes", "id")
    cari.searchParams.set("limit", "5")
    cari.searchParams.set("viewbox", KOTAK_SIANTAR)
    cari.searchParams.set("bounded", "1")

    const jawab = await fetch(cari, {
      headers: {
        // Diminta eksplisit oleh ketentuan pemakaian Nominatim. Asal
        // permintaan ikut disebut supaya penyalahgunaan bisa dilacak balik
        // ke pemasangan ini, bukan ke "sebuah aplikasi Next.js".
        "User-Agent": `KPR-BRI/1.0 (${url.origin})`,
        "Accept-Language": "id",
      },
      // Hasil geokode alamat praktis tidak berubah dari hari ke hari, dan
      // menyimpannya sehari adalah cara paling langsung untuk tidak
      // membebani layanan sukarela dengan pertanyaan yang sama berulang.
      next: { revalidate: 86_400 },
      // Pencarian alamat yang menggantung lebih buruk daripada pencarian
      // alamat yang gagal: yang satu membekukan kolom isian, yang lain
      // tinggal dicoba lagi.
      signal: AbortSignal.timeout(4_000),
    })

    if (!jawab.ok) return NextResponse.json(KOSONG)

    const mentah: unknown = await jawab.json()
    if (!Array.isArray(mentah)) return NextResponse.json(KOSONG)

    const hasil: Titik[] = []
    for (const baris of mentah) {
      if (typeof baris !== "object" || baris === null) continue
      const b = baris as Record<string, unknown>
      const lat = Number(b.lat)
      const lng = Number(b.lon)
      const label = typeof b.display_name === "string" ? b.display_name : ""
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) continue
      // Nominatim menjawab dengan alamat lengkap sampai kode pos dan negara;
      // dua ruas pertama sudah cukup mengenali tempatnya pada satu chip.
      hasil.push({ lat, lng, label: label.split(",").slice(0, 2).join(",").trim() })
    }

    return NextResponse.json({ hasil })
  } catch {
    // Termasuk AbortSignal.timeout dan galat jaringan. Pencarian alamat
    // adalah kenyamanan, bukan jalan satu-satunya — dua sumber titik acuan
    // lainnya (lokasi saya, pilih di peta) tetap bekerja tanpa rute ini.
    return NextResponse.json(KOSONG)
  }
}
