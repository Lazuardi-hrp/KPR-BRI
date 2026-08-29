#!/usr/bin/env node
/**
 * Memindahkan 15 foto public/kpr-assets/ ke bucket Storage 'perumahan'.
 *
 * Untuk tiap baris housing_images yang masih menunjuk path publik lama
 * ('/kpr-assets/x.jpg'):
 *   1. baca berkasnya, ubah ke WebP q72 dan potong 4:3 master 1200x900 (§11),
 *   2. unggah ke perumahan/{housing_id}/{nama}.webp,
 *   3. bangkitkan LQIP 12px lalu simpan width/height/bytes/blur_data_url.
 *
 * storage_path BARU ditulis setelah unggahan berhasil, per baris. Jadi kalau
 * skrip ini gagal di tengah jalan, baris yang belum terunggah tetap menunjuk
 * berkas lokal yang masih ada — tidak ada gambar yang rusak di situs.
 * Aman dijalankan ulang.
 */
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local.")
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const BUCKET = "perumahan"

const { data: rows, error } = await sb
  .from("housing_images")
  .select("id, housing_id, storage_path, alt")
  .like("storage_path", "/kpr-assets/%")

if (error) {
  console.error("Gagal membaca housing_images:", error.message)
  process.exit(1)
}
if (rows.length === 0) {
  console.log("Tidak ada baris yang masih menunjuk /kpr-assets/. Sudah termigrasi.")
  process.exit(0)
}

console.log(`${rows.length} gambar akan dipindahkan.\n`)
let ok = 0
let gagal = 0

for (const r of rows) {
  const lokal = path.join("public", r.storage_path)
  if (!fs.existsSync(lokal)) {
    console.error(`  LEWAT  ${r.storage_path} — berkas lokal tidak ada`)
    gagal++
    continue
  }

  try {
    const stem = path.basename(r.storage_path).replace(/\.[^.]+$/, "")
    const tujuan = `${r.housing_id}/${stem}.webp`

    const webp = await sharp(lokal)
      .resize(1200, 900, { fit: "cover", position: "centre" })
      .webp({ quality: 72 })
      .toBuffer()

    const { error: errUp } = await sb.storage
      .from(BUCKET)
      .upload(tujuan, webp, { contentType: "image/webp", upsert: true })
    if (errUp) throw new Error(errUp.message)

    const blur = await sharp(webp).resize(12, 9, { fit: "cover" }).webp({ quality: 35 }).toBuffer()

    // storage_path baru ditulis hanya setelah unggahan sukses.
    const { error: errDb } = await sb
      .from("housing_images")
      .update({
        storage_path: tujuan,
        width: 1200,
        height: 900,
        bytes: webp.byteLength,
        blur_data_url: `data:image/webp;base64,${blur.toString("base64")}`,
      })
      .eq("id", r.id)
    if (errDb) throw new Error(errDb.message)

    console.log(`  OK     ${r.storage_path} -> ${tujuan} (${(webp.byteLength / 1024).toFixed(0)} KB)`)
    ok++
  } catch (e) {
    console.error(`  GAGAL  ${r.storage_path} — ${e.message}`)
    gagal++
  }
}

console.log(`\nSelesai: ${ok} berhasil, ${gagal} gagal.`)
if (ok > 0) {
  console.log("Aset lama di public/kpr-assets/ SENGAJA dipertahankan (batasan design.md §0.2).")
}
process.exit(gagal === 0 ? 0 : 1)
