"use server"

import { createClient } from "@/lib/supabase/server"
import { createAnonClient } from "@/lib/supabase/anon"
import { jagaAksi } from "@/lib/security/guard"
import { hashIdentitas } from "@/lib/security/identity"

/**
 * Masuk ke dashboard admin.
 *
 * Sebelumnya ini terjadi seluruhnya di klien: halaman login memanggil
 * signInWithPassword() langsung dari browser. Itu aman dalam arti kredensialnya
 * tetap diverifikasi Supabase Auth — tetapi berarti satu-satunya aksi bernilai
 * paling tinggi di situs ini adalah SATU-SATUNYA yang melewati lapisan
 * anti-penyalahgunaan tanpa meninggalkan jejak. Percobaan menebak kata sandi
 * bisa berjalan semalaman tanpa satu baris pun muncul di halaman Keamanan.
 *
 * Memindahkannya ke server memberi tiga hal yang tidak bisa didapat di klien:
 *   1. Kuota per identitas SEBELUM kredensial dicoba, jadi penebakan berhenti
 *      di gerbang alih-alih membebani server Auth.
 *   2. Kegagalan tercatat sebagai peristiwa keamanan, dan sepuluh kegagalan
 *      dalam 15 menit berujung blokir sementara.
 *   3. Pemeriksaan peran ikut dilakukan di server, sehingga akun 'viewer' tidak
 *      pernah sempat memegang sesi yang aktif walau sekejap.
 */

export type HasilMasuk =
  | { ok: true; tujuan: string }
  | { ok: false; error: string }

/** Satu kalimat untuk setiap kegagalan kredensial. */
const KREDENSIAL_SALAH = "Email atau kata sandi tidak sesuai."

export async function masukAdmin(formData: FormData): Promise<HasilMasuk> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const lanjutMentah = String(formData.get("lanjut") ?? "")

  if (!email || !password) {
    return { ok: false, error: "Email dan kata sandi wajib diisi." }
  }

  // ── Gerbang keamanan ──────────────────────────────────────────────────
  //
  // Dijalankan lebih dulu, sebelum kata sandi menyentuh server Auth sama
  // sekali. Tidak ada sinyal perilaku yang dikirim: formulir login tidak punya
  // honeypot, dan waktu pengisiannya bukan penanda bot yang berarti untuk
  // petugas yang mengetikkan kata sandinya dari pengelola kata sandi.
  // Yang menahan di sini adalah kuota dan riwayat, bukan tebakan perilaku.
  const { putusan } = await jagaAksi("login", "/admin/login")

  if (putusan.hasil === "tolak") {
    return { ok: false, error: putusan.pesan }
  }
  // 'tantang' pada login sengaja diperlakukan sebagai lolos: satu-satunya
  // pengguna halaman ini adalah petugas yang sudah dikenal, dan menampilkan
  // CAPTCHA kepada mereka menukar keamanan yang tidak bertambah dengan
  // gangguan yang nyata. Percobaan yang gagal tetap dicatat dan tetap
  // berujung blokir, jadi penebakan tidak menjadi lebih murah.

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    await catatGagalMasuk()
    // Pesannya tidak membedakan "email tidak terdaftar" dari "kata sandi
    // salah" — membedakannya memberi tahu penyerang alamat mana yang valid.
    return { ok: false, error: KREDENSIAL_SALAH }
  }

  // Punya akun bukan berarti punya akses. Peran bawaan setiap akun baru adalah
  // 'viewer'; kenaikan ke admin/pengembang dilakukan manual.
  const { data: profil } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle()

  if (!profil?.is_active || (profil.role !== "admin" && profil.role !== "pengembang")) {
    await supabase.auth.signOut()
    // TIDAK dicatat sebagai auth_fail: kredensialnya benar. Ini soal
    // wewenang, bukan penyusupan, dan menghitungnya sebagai kegagalan akan
    // memblokir petugas yang akunnya sekadar belum diberi peran.
    return {
      ok: false,
      error: "Akun ini belum diberi akses ke dashboard. Hubungi administrator.",
    }
  }

  // Hanya path relatif di dalam /admin yang diterima. Tanpa pemeriksaan ini
  // ?lanjut= menjadi open redirect: tautan "login" yang sah mendarat di situs
  // penyerang setelah sesi terbentuk.
  const tujuan =
    lanjutMentah.startsWith("/admin") && !lanjutMentah.startsWith("//")
      ? lanjutMentah
      : "/admin"

  return { ok: true, tujuan }
}

/**
 * Mencatat satu percobaan masuk yang gagal.
 *
 * Memakai klien anon, bukan klien bersesi: pada titik ini memang belum ada
 * sesi. record_auth_fail berupa SECURITY DEFINER dengan kuotanya sendiri,
 * jadi anon boleh memanggilnya tanpa bisa menyalahgunakannya.
 *
 * Kegagalan pencatatan tidak boleh menggagalkan login. Bila basis data sedang
 * tidak bisa dihubungi, yang benar adalah tetap mengembalikan "kredensial
 * salah" — bukan membocorkan bahwa ada yang tidak beres di dalam.
 */
async function catatGagalMasuk(): Promise<void> {
  try {
    const ipHash = await hashIdentitas()
    await createAnonClient().rpc("record_auth_fail", { p_ip_hash: ipHash })
  } catch {
    // Sengaja dibiarkan senyap.
  }
}
