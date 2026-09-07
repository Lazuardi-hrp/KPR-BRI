#!/usr/bin/env node
/**
 * Memastikan tidak ada nilai rahasia yang masuk ke bundel klien (PRD R-3).
 *
 * Memeriksa NILAI-nya, bukan nama variabelnya. Nama seperti "sb_secret_" muncul
 * sah di dalam @supabase/supabase-js sebagai pendeteksi format kunci, sehingga
 * grep berbasis nama selalu memberi positif palsu.
 */
import fs from "node:fs"
import path from "node:path"

const DIR = ".next/static"
const RAHASIA = ["SUPABASE_SERVICE_ROLE_KEY", "LEAD_IP_SALT", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY"]

if (!fs.existsSync(DIR)) {
  console.error(`${DIR} tidak ada. Jalankan \`npm run build\` lebih dulu.`)
  process.exit(1)
}

const nilai = RAHASIA.map((n) => [n, process.env[n]]).filter(
  ([, v]) => typeof v === "string" && v.length >= 8,
)

if (nilai.length === 0) {
  console.log("Tidak ada nilai rahasia terisi di lingkungan — tidak ada yang bisa bocor.")
  process.exit(0)
}

const berkas = []
;(function jelajah(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) jelajah(p)
    else if (/\.(js|mjs|css|map|json)$/.test(e.name)) berkas.push(p)
  }
})(DIR)

let bocor = 0
for (const f of berkas) {
  const isi = fs.readFileSync(f, "utf8")
  for (const [nama, v] of nilai) {
    if (isi.includes(v)) {
      console.error(`BOCOR: nilai ${nama} ditemukan di ${f}`)
      bocor++
    }
  }
}

console.log(
  bocor === 0
    ? `Bersih: ${nilai.length} nilai rahasia diperiksa terhadap ${berkas.length} berkas bundel, nol kebocoran.`
    : `${bocor} kebocoran ditemukan.`,
)
process.exit(bocor === 0 ? 0 : 1)
