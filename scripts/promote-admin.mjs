#!/usr/bin/env node
/**
 * Menaikkan akun yang sudah ada menjadi 'admin' atau 'pengembang'.
 *
 *   npm run admin:promote -- nama@bri.co.id
 *   npm run admin:promote -- nama@pengembang.co.id pengembang <developer_uuid>
 *
 * Akun ITU SENDIRI dibuat lewat Dashboard Supabase (Authentication > Add user),
 * bukan di sini — PRD §9.1 melarang pendaftaran mandiri, dan Dashboard mengisi
 * seluruh kolom internal GoTrue dengan benar. Membuat pengguna lewat SQL mentah
 * menyisakan kolom token bernilai NULL yang membuat login gagal dengan pesan
 * "Database error querying schema".
 *
 * Kenaikan peran memang sengaja manual: trigger handle_new_user() selalu
 * memberi peran 'viewer', tidak pernah membaca peran dari metadata pengguna
 * (yang bisa dikendalikan pendaftar).
 */
import { createClient } from "@supabase/supabase-js"

const [email, peran = "admin", developerId = null] = process.argv.slice(2)

if (!email) {
  console.error("Pemakaian: npm run admin:promote -- <email> [admin|pengembang] [developer_uuid]")
  process.exit(1)
}
if (!["admin", "pengembang", "viewer"].includes(peran)) {
  console.error(`Peran tidak dikenal: ${peran}`)
  process.exit(1)
}
if (peran === "pengembang" && !developerId) {
  console.error("Peran 'pengembang' wajib disertai developer_uuid (profiles_role_developer_ck).")
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error(
    "Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local.\n" +
      "Ambil kunci secret di Dashboard > Project Settings > API keys.",
  )
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

const { data: daftar, error: errList } = await sb.auth.admin.listUsers({ perPage: 1000 })
if (errList) {
  console.error("Gagal membaca daftar pengguna:", errList.message)
  process.exit(1)
}

const user = daftar.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
if (!user) {
  console.error(
    `Akun ${email} belum ada.\n` +
      "Buat dulu di Dashboard Supabase > Authentication > Add user (centang Auto Confirm User).",
  )
  process.exit(1)
}

const { error } = await sb
  .from("profiles")
  .update({ role: peran, developer_id: peran === "pengembang" ? developerId : null })
  .eq("id", user.id)

if (error) {
  console.error("Gagal menaikkan peran:", error.message)
  process.exit(1)
}

console.log(`${email} kini berperan '${peran}'.`)
if (peran === "admin") {
  console.log("Ingat: aktifkan MFA/TOTP untuk akun ini di Dashboard — ini produk keuangan.")
}
