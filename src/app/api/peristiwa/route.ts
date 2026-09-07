import { NextResponse } from "next/server"

import { createAnonClient } from "@/lib/supabase/anon"
import { jagaAksi } from "@/lib/security/guard"
import { hashSesi } from "@/lib/security/identity"
import { EventSchema } from "@/lib/schemas/event"

/**
 * Suar analitik — satu-satunya jalan peristiwa dari peramban masuk ke
 * housing_events.
 *
 * KENAPA ROUTE HANDLER, BUKAN SERVER ACTION
 * Halaman yang paling perlu diukur — '/', '/perumahan/[slug]', '/map',
 * '/simulasi' — semuanya SSG + ISR (`export const revalidate = 300`). Pada
 * cache hit, tampilan halaman TIDAK PERNAH menyentuh server, jadi tidak ada
 * tempat di RSC yang bisa mencatatnya; pencatatan harus datang dari peramban.
 * Dan yang mengirim dari peramban adalah navigator.sendBeacon, yang menembak
 * URL biasa dan bertahan melewati pembongkaran halaman. Server Action tidak
 * bisa menjadi sasaran sendBeacon.
 *
 * SELALU 204 — APA PUN YANG TERJADI
 * Tidak ada seorang pun yang membaca jawaban endpoint ini. sendBeacon bahkan
 * tidak menyediakan cara membacanya. Karena itu setiap kegagalan berakhir
 * sebagai baris yang tidak ditulis, bukan sebagai galat: muatan cacat, kuota
 * habis, basis data sedang murung — semuanya 204. Alternatifnya adalah galat
 * yang tidak pernah ditangani siapa pun tetapi tetap membakar koneksi, dan
 * pada kasus terburuk sebuah baris merah di konsol pengunjung yang sedang
 * menghitung cicilan rumahnya.
 *
 * Prinsip yang sama sudah berlaku di whatsapp-cta.tsx: analitik tidak pernah
 * menghalangi pengguna.
 *
 * Runtime Node.js wajib: hashSesi memakai node:crypto.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Satu-satunya jawaban yang pernah dikirim endpoint ini. */
const SELESAI = new NextResponse(null, { status: 204 })

export async function POST(request: Request) {
  try {
    // Route handler tidak mendapat pemeriksaan asal bawaan seperti Server
    // Action. Sama seperti rute unggah foto, satu baris ini menutup POST
    // lintas situs tanpa bergantung pada atribut cookie semata.
    const asal = request.headers.get("origin")
    if (asal && asal !== new URL(request.url).origin) return SELESAI

    const mentah: unknown = await request.json()
    const hasil = EventSchema.safeParse(mentah)
    if (!hasil.success) return SELESAI

    const { kind, housingId, session, referrer } = hasil.data

    // Kuota per identitas. Ambang tantangan untuk aksi ini disamakan dengan
    // batasnya di migrasi 0022, jadi putusan 'tantang' tidak mungkin muncul —
    // yang tersisa hanya lolos atau tolak, dan tolak berarti diam.
    const { putusan } = await jagaAksi("peristiwa", kind, {})
    if (putusan.hasil !== "lolos") return SELESAI

    const supabase = createAnonClient()
    await supabase.rpc("record_event", {
      p_housing_id: housingId ?? null,
      p_kind: kind,
      // Nilai acak dari peramban tidak pernah disimpan apa adanya; lihat
      // alasan lengkapnya di hashSesi().
      p_session: hashSesi(session),
      p_referrer: referrer ?? null,
    })
  } catch {
    // Sengaja ditelan. Lihat "SELALU 204" di atas.
  }

  return SELESAI
}
