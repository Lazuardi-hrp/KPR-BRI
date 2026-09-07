import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

import { getSesiStaf } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { GalatFoto, optimalkanFoto } from "@/lib/images/process"
import {
  MAKS_BYTE_KIRIM,
  MAKS_FOTO,
  UploadFieldsSchema,
  periksaBerkas,
  type FotoPerumahan,
} from "@/lib/schemas/image"

/**
 * Unggah (dan ganti) foto perumahan.
 *
 * KENAPA ROUTE HANDLER, BUKAN SERVER ACTION
 * Server Action membatasi badan permintaan pada 1 MB secara bawaan. Menaikkan
 * serverActions.bodySizeLimit akan menaikkannya untuk SETIAP action di
 * aplikasi ini — termasuk formulir prospek publik, yang justru ingin tetap
 * kecil sebagai permukaan penyalahgunaan. Route handler memberi batas longgar
 * tepat di satu tempat yang membutuhkannya, tanpa melonggarkan yang lain.
 * Selebihnya (hapus, urutkan, sampul, alt) tetap Server Action.
 *
 * URUTAN YANG TIDAK BOLEH DITUKAR
 *   1. objek diunggah ke Storage,
 *   2. baris housing_images ditulis.
 * Bila (2) gagal, yang tertinggal adalah berkas yatim di bucket — tidak
 * terlihat siapa pun. Bila urutannya dibalik dan (1) yang gagal, yang
 * tertinggal adalah baris yang menunjuk berkas tidak ada: gambar rusak di
 * halaman publik. Berkas yatim jauh lebih murah daripada galeri rusak, dan
 * di sini ia dibersihkan lagi bila (2) gagal.
 *
 * Runtime Node.js wajib: sharp adalah binding native dan tidak berjalan di Edge.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUCKET = "perumahan"

function galat(pesan: string, status = 400) {
  return NextResponse.json({ ok: false, error: pesan }, { status })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: housingId } = await params

  // Route handler tidak mendapat pemeriksaan asal bawaan seperti Server
  // Action. Cookie Supabase memang SameSite=Lax — yang sudah menghalangi POST
  // lintas situs — tetapi bergantung pada satu atribut cookie untuk satu-
  // satunya endpoint tulis yang tidak dilindungi kerangka kerja adalah
  // taruhan yang tidak perlu diambil.
  const asal = request.headers.get("origin")
  if (asal && asal !== new URL(request.url).origin) {
    return galat("Permintaan ditolak: asal tidak dikenali.", 403)
  }

  const sesi = await getSesiStaf()
  if (!sesi) return galat("Sesi berakhir. Silakan masuk kembali.", 401)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return galat("Muatan tidak terbaca. Coba unggah ulang.", 400)
  }

  const berkas = form.get("file")
  if (!(berkas instanceof File)) return galat("Tidak ada berkas yang dikirim.")

  const bidang = UploadFieldsSchema.safeParse({
    alt: form.get("alt") ?? "",
    gantiId: form.get("gantiId") ?? "",
  })
  if (!bidang.success) {
    return galat(bidang.error.issues[0]?.message ?? "Isian tidak valid.")
  }
  const { alt, gantiId } = bidang.data

  // Pemeriksaan murah lebih dulu. periksaBerkas() sama persis dengan yang
  // dijalankan browser — diulang di sini karena yang di browser bisa dilewati.
  const keluhan = periksaBerkas(berkas)
  if (keluhan) return galat(keluhan)
  if (berkas.size > MAKS_BYTE_KIRIM) {
    return galat("Berkas terlalu besar setelah diciutkan. Coba foto dengan resolusi lebih rendah.", 413)
  }

  const supabase = await createClient()

  // Wewenang ditentukan RLS, dan inilah pembacaan yang menegakkannya: baris
  // ini hanya terbaca bila perumahannya memang milik pemanggil — kebijakan
  // housings_read_staff. Menemukannya di sini berarti kegagalannya berupa 404
  // yang jelas, bukan galat RLS di tengah unggahan yang berkasnya sudah
  // terlanjur mendarat di bucket.
  const { data: perumahan } = await supabase
    .from("housings")
    .select("id")
    .eq("id", housingId)
    .is("deleted_at", null)
    .maybeSingle()
  if (!perumahan) return galat("Perumahan tidak ditemukan atau bukan wewenang Anda.", 404)

  // Baris yang diganti dibaca SEBELUM apa pun diunggah: bila id-nya salah,
  // lebih baik gagal sekarang daripada meninggalkan berkas yatim.
  let lama: { id: string; storage_path: string } | null = null
  if (gantiId) {
    const { data } = await supabase
      .from("housing_images")
      .select("id, storage_path")
      .eq("id", gantiId)
      .eq("housing_id", housingId)
      .maybeSingle()
    if (!data) return galat("Foto yang hendak diganti tidak ditemukan.", 404)
    lama = data
  } else {
    const { count } = await supabase
      .from("housing_images")
      .select("id", { count: "exact", head: true })
      .eq("housing_id", housingId)
    if ((count ?? 0) >= MAKS_FOTO) {
      return galat(
        `Batas ${MAKS_FOTO} foto per perumahan sudah tercapai. Hapus salah satu foto lama lebih dulu.`,
      )
    }
  }

  let hasil
  try {
    hasil = await optimalkanFoto(Buffer.from(await berkas.arrayBuffer()))
  } catch (e) {
    if (e instanceof GalatFoto) return galat(e.message)
    return galat("Gambar gagal diproses. Coba berkas lain.", 500)
  }

  // Nama berkas acak, bukan nama asli unggahan. Nama asli membawa spasi,
  // huruf non-ASCII dan tabrakan ('IMG_0001.jpg' dari dua ponsel berbeda),
  // dan unique (housing_id, storage_path) akan menolak yang kedua. Awalan
  // {housing_id}/ wajib: kebijakan perumahan_insert_staff (migrasi 0005)
  // membaca kepemilikan dari segmen pertama path.
  const tujuan = `${housingId}/${randomUUID()}.webp`

  const { error: errUnggah } = await supabase.storage
    .from(BUCKET)
    .upload(tujuan, hasil.webp, { contentType: "image/webp", cacheControl: "31536000" })

  if (errUnggah) {
    return galat(
      errUnggah.message.toLowerCase().includes("row-level security") ||
        errUnggah.message.toLowerCase().includes("unauthorized")
        ? "Anda tidak berhak mengunggah foto untuk perumahan ini."
        : "Gagal mengunggah berkas ke penyimpanan. Coba lagi.",
      500,
    )
  }

  const nilai = {
    storage_path: tujuan,
    alt,
    width: hasil.width,
    height: hasil.height,
    bytes: hasil.bytes,
    blur_data_url: hasil.blurDataUrl,
  }

  const { data: baris, error: errDb } = lama
    ? await supabase
        .from("housing_images")
        .update(nilai)
        .eq("id", lama.id)
        .select("id, storage_path, alt, width, height, bytes, sort_order, is_cover, blur_data_url")
        .single()
    : await supabase
        .from("housing_images")
        .insert({ housing_id: housingId, ...nilai })
        .select("id, storage_path, alt, width, height, bytes, sort_order, is_cover, blur_data_url")
        .single()

  if (errDb || !baris) {
    // Baris gagal ditulis, jadi berkasnya tidak pernah dirujuk siapa pun.
    // Menghapusnya di sini adalah satu-satunya kesempatan: setelah respons
    // ini pergi, tidak ada lagi yang tahu berkas itu ada.
    await supabase.storage.from(BUCKET).remove([tujuan])

    // housing_images_cap (migrasi 0020) menaikkan check_violation dengan
    // kalimat berbahasa Indonesia yang memang ditulis untuk dibaca pengguna,
    // jadi diteruskan apa adanya. Jalur ini praktis hanya terpicu bila dua tab
    // admin mengunggah foto ke-12 bersamaan — hitungan di atas menangkap
    // selebihnya lebih dulu.
    const dariTrigger = errDb?.code === "23514" && errDb.message.startsWith("Batas ")
    return galat(
      dariTrigger ? errDb!.message : "Foto terunggah tetapi gagal dicatat. Coba lagi.",
      dariTrigger ? 409 : 500,
    )
  }

  // Berkas lama dihapus paling akhir, setelah barisnya benar-benar menunjuk
  // yang baru. Kegagalan di sini tidak merusak apa pun — hanya menyisakan
  // berkas yang tidak dirujuk.
  if (lama && lama.storage_path !== tujuan && !lama.storage_path.startsWith("/")) {
    await supabase.storage.from(BUCKET).remove([lama.storage_path])
  }

  segarkanFoto(housingId)

  return NextResponse.json({ ok: true, foto: baris as FotoPerumahan })
}

/**
 * Membatalkan cache pembacaan publik setelah galeri berubah.
 *
 * revalidateTag, BUKAN updateTag seperti di app/admin/actions.ts: updateTag
 * hanya sah di dalam Server Action dan melempar bila dipanggil dari Route
 * Handler.
 *
 * `{ expire: 0 }` — bukan profil "max" yang biasanya disarankan. Profil itu
 * membolehkan tanggapan basi disajikan setahun penuh sementara yang baru
 * dibangun di latar; di sini yang basi persis berarti "foto yang baru saja
 * dihapus admin masih terpasang di beranda". Dengan expire 0, permintaan
 * berikutnya menunggu data segar — perilaku yang sama dengan updateTag, yang
 * memang tidak boleh dipanggil dari sini.
 */
function segarkanFoto(housingId: string) {
  revalidateTag("housings", { expire: 0 })
  revalidatePath("/")
  revalidatePath("/map")
  revalidatePath("/perumahan/[slug]", "page")
  revalidatePath(`/admin/perumahan/${housingId}`)
}
