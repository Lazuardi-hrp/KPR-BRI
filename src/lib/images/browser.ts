"use client"

import { MAKS_BYTE_KIRIM } from "@/lib/schemas/image"

/**
 * Penciutan sisi browser — SEMATA agar muatannya muat, bukan demi kualitas.
 *
 * Bentuk akhir foto ditentukan sharp di server (src/lib/images/process.ts).
 * Yang dikerjakan di sini hanya menyelesaikan satu masalah transportasi:
 * fungsi serverless di Vercel menolak badan permintaan di atas ~4,5 MB, dan
 * penolakannya terjadi di platform — route handler tidak pernah jalan, jadi
 * tidak ada pesan yang bisa ditampilkan ke admin. Foto 12 MB dari ponsel akan
 * "gagal" tanpa satu kata penjelasan.
 *
 * Karena itu ambangnya konservatif dan jalur cepatnya lebar: berkas yang sudah
 * di bawah batas dikirim UTUH, apa adanya, supaya server bekerja dari sumber
 * terbaik yang tersedia. Hanya yang benar-benar kebesaran yang disentuh.
 */

/** Sisi terpanjang tahap antar. Lebih besar dari MAKS_SISI: server yang memutuskan hasil akhir. */
const SISI_ANTAR = 2400

/** Turun bertahap sampai muat. Berhenti di 0,6 — di bawah itu server menerima sumber yang sudah rusak. */
const MUTU = [0.92, 0.82, 0.7, 0.6]

/**
 * Mengembalikan berkas yang siap dikirim.
 *
 * Tidak pernah melempar: setiap kegagalan (browser tanpa canvas, format yang
 * tidak bisa didekode, kuota memori) berujung pada pengiriman berkas ASLI.
 * Server lalu menolaknya dengan kalimat yang bisa dibaca — itu jauh lebih baik
 * daripada galat JavaScript di tengah antrean unggah.
 */
export async function siapkanUnggahan(file: File): Promise<File> {
  if (file.size <= MAKS_BYTE_KIRIM) return file
  if (typeof createImageBitmap !== "function") return file

  let bitmap: ImageBitmap
  try {
    // imageOrientation "from-image" menerapkan EXIF Orientation saat dekode.
    // Tanpa itu, foto potret dari ponsel dikirim ke server dalam keadaan
    // rebah DAN tanpa penanda EXIF-nya — sharp tidak punya cara menegakkannya
    // kembali, dan fotonya tampil miring 90° selamanya.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    return file
  }

  try {
    const skala = Math.min(1, SISI_ANTAR / Math.max(bitmap.width, bitmap.height))
    const lebar = Math.max(1, Math.round(bitmap.width * skala))
    const tinggi = Math.max(1, Math.round(bitmap.height * skala))

    const canvas = document.createElement("canvas")
    canvas.width = lebar
    canvas.height = tinggi
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, lebar, tinggi)

    for (const mutu of MUTU) {
      const blob = await keBlob(canvas, mutu)
      if (!blob) return file
      if (blob.size <= MAKS_BYTE_KIRIM) {
        return new File([blob], gantiEkstensi(file.name, blob.type), { type: blob.type })
      }
    }
    return file
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}

/**
 * WebP dulu, JPEG bila encoder-nya tidak ada.
 *
 * toBlob() TIDAK melempar untuk tipe yang tak didukung — ia diam-diam
 * mengembalikan PNG, yang untuk foto justru lebih besar daripada aslinya dan
 * membuat seluruh latihan ini sia-sia. Karena itu tipe hasilnya diperiksa,
 * bukan diasumsikan.
 */
function keBlob(canvas: HTMLCanvasElement, mutu: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => {
        if (b && b.type === "image/webp") return resolve(b)
        canvas.toBlob((j) => resolve(j), "image/jpeg", mutu)
      },
      "image/webp",
      mutu,
    )
  })
}

function gantiEkstensi(nama: string, mime: string) {
  const ext = mime === "image/webp" ? "webp" : "jpg"
  return `${nama.replace(/\.[^.]+$/, "")}.${ext}`
}
