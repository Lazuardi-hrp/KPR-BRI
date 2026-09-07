import "server-only"

import sharp from "sharp"
import type { Metadata, Sharp } from "sharp"

import {
  KUALITAS_WEBP,
  MAKS_SISI,
  MIN_LEBAR,
  MIN_TINGGI,
} from "@/lib/schemas/image"

/**
 * Pipa optimasi foto perumahan.
 *
 * Ini pemilik TUNGGAL bentuk berkas yang mendarat di bucket. Browser boleh
 * menciutkan foto sebelum mengirim — itu semata supaya muatannya muat di batas
 * badan permintaan — tetapi hasil akhirnya selalu dibuat ulang di sini. Kalau
 * kualitas dan dimensi ditentukan browser, dua admin dengan dua browser akan
 * menghasilkan dua standar, dan tidak ada yang bisa dibetulkan belakangan
 * tanpa mengunggah ulang semuanya.
 *
 * Aturannya sama dengan scripts/upload-housing-images.mjs, dengan satu
 * perbedaan yang disengaja: skrip itu MEMOTONG ke 4:3 karena ia memigrasikan
 * 16 foto yang memang seragam. Di sini rasio aslinya dipertahankan — memotong
 * foto orang tanpa memperlihatkan potongannya adalah cara pasti memenggal
 * atap rumah yang justru ingin mereka tunjukkan. Galeri dan kartu memakai
 * object-cover, jadi rasio apa pun tetap tampil rapi.
 */

export type HasilOptimasi = {
  webp: Buffer
  width: number
  height: number
  bytes: number
  blurDataUrl: string
}

export class GalatFoto extends Error {}

/**
 * Menormalkan satu foto menjadi WebP siap tayang beserta LQIP-nya.
 *
 * `sharp` juga berperan sebagai validator isi: berkas yang mengaku image/webp
 * lewat header multipart tetapi bukan gambar akan gagal di metadata(), sebelum
 * satu bita pun sampai ke Storage. Pemeriksaan MIME di lapisan atas hanya
 * membaca yang diakui klien; ini yang membaca isinya.
 */
export async function optimalkanFoto(masukan: Buffer): Promise<HasilOptimasi> {
  let gambar: Sharp
  let meta: Metadata

  try {
    // limitInputPixels menahan "decompression bomb": PNG 100 megapiksel
    // berukuran beberapa ratus kilobita yang meledak menjadi gigabita begitu
    // didekode. 80 MP jauh di atas kamera mana pun yang wajar.
    gambar = sharp(masukan, { limitInputPixels: 80_000_000, failOn: "error" })
    meta = await gambar.metadata()
  } catch {
    throw new GalatFoto("Berkas ini bukan gambar yang bisa dibaca.")
  }

  // EXIF Orientation: foto potret dari ponsel tersimpan sebagai lanskap plus
  // penanda putar. meta.width/height mengabaikan penanda itu — memakainya
  // untuk memeriksa resolusi minimum berarti menolak foto potret yang
  // sebenarnya cukup besar. meta.autoOrient sudah memperhitungkannya.
  const lebarAsli = meta.autoOrient?.width ?? meta.width
  const tinggiAsli = meta.autoOrient?.height ?? meta.height

  if (!lebarAsli || !tinggiAsli) {
    throw new GalatFoto("Dimensi gambar tidak terbaca.")
  }
  if (lebarAsli < MIN_LEBAR || tinggiAsli < MIN_TINGGI) {
    throw new GalatFoto(
      `Resolusi ${lebarAsli}×${tinggiAsli} terlalu kecil. Minimal ${MIN_LEBAR}×${MIN_TINGGI} piksel.`,
    )
  }

  const webp = await gambar
    .autoOrient() // terapkan EXIF Orientation; metadata ikut ditanggalkan
    .resize(MAKS_SISI, MAKS_SISI, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: KUALITAS_WEBP, effort: 4 })
    .toBuffer()

  // Dimensi hasil dibaca dari keluaran, bukan dihitung dari masukan:
  // pembulatan fit:"inside" milik sharp yang menentukan, dan angka inilah
  // yang dipakai next/image untuk memesan ruang tata letak.
  const metaHasil = await sharp(webp).metadata()

  // LQIP 12px — persis resep scripts/upload-housing-images.mjs, supaya foto
  // lama hasil migrasi dan foto baru dari dashboard punya blur yang sama
  // rasa. Disimpan per baris di housing_images.blur_data_url; peta statis di
  // src/lib/image-blur.ts hanya melayani 16 foto seed dan tidak pernah tahu
  // apa pun tentang unggahan baru.
  const blur = await sharp(webp)
    .resize(12, 12, { fit: "inside" })
    .webp({ quality: 35 })
    .toBuffer()

  return {
    webp,
    width: metaHasil.width ?? MAKS_SISI,
    height: metaHasil.height ?? MAKS_SISI,
    bytes: webp.byteLength,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  }
}
