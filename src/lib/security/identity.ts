import "server-only"

import { createHash } from "node:crypto"
import { headers } from "next/headers"

/**
 * Identitas pemanggil untuk keperluan kuota — bukan pengenal orang.
 *
 * IP mentah tidak pernah disimpan di mana pun (PRD §9.4, §13.1). Yang beredar
 * hanyalah sha256(ip + garam). Garamnya rahasia server, jadi hash-nya tidak
 * bisa dibalik dengan menebak seluruh ruang IPv4.
 *
 * Nilainya WAJIB terisi. guard_request menolak permintaan tanpa identitas
 * ketimbang melayaninya tanpa kuota, jadi ketika IP tidak terbaca sekalipun
 * fungsi ini tetap mengembalikan hash — dari penanda konstan — supaya
 * kuotanya tetap berlaku alih-alih terbuka lebar.
 */
export async function hashIdentitas(): Promise<string> {
  const h = await headers()
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "ip-tidak-diketahui"

  const salt = process.env.LEAD_IP_SALT
  if (!salt) throw new Error("LEAD_IP_SALT belum diatur.")
  return createHash("sha256").update(`${ip}${salt}`).digest("hex")
}

/** User agent yang dipangkas, atau null bila tidak ada sama sekali. */
export async function userAgent(): Promise<string | null> {
  const h = await headers()
  const ua = h.get("user-agent")?.trim()
  return ua ? ua.slice(0, 400) : null
}

/**
 * Pengenal sesi untuk analitik — bukan pengenal orang, dan bukan turunan IP.
 *
 * KENAPA BUKAN hashIdentitas()
 * hashIdentitas() adalah sha256(ip + garam) dan STABIL sepanjang waktu. Itu
 * tepat untuk kuota, yang memang harus mengenali pemanggil yang sama besok.
 * Untuk analitik yang disimpan 180 hari, pengenal stabil berbasis IP adalah
 * dua kesalahan sekaligus:
 *
 *   1. Ia menjadi pengenal pseudonim yang bertahan setengah tahun — persis
 *      yang tidak ingin dikumpulkan situs ini (PRD §13.1).
 *   2. Ia SALAH menghitung. NAT operator seluler menaruh puluhan ribu orang
 *      di balik satu IP; seluruh Pematangsiantar bisa muncul sebagai
 *      belasan "pengunjung". Angka yang salah arah lebih buruk daripada
 *      angka yang tidak ada, karena ia tetap dipakai mengambil keputusan.
 *
 * Yang dipakai sebagai gantinya: nilai acak yang dicetak peramban sekali per
 * sesi (crypto.randomUUID di sessionStorage, lihat src/components/jejak.ts),
 * mati ketika tab ditutup, dan tidak pernah dikirim ke pihak mana pun selain
 * server ini. Server meng-hash-nya dengan garam sebelum menyimpan, sehingga
 * nilai di basis data tidak bisa dicocokkan dengan nilai yang masih hidup di
 * peramban seseorang tanpa memegang garamnya.
 *
 * Konsekuensi yang harus diketahui: nilai ini datang dari klien, jadi ia bisa
 * dicetak ulang berkali-kali untuk menggelembungkan "pengunjung". Yang
 * benar-benar membatasi itu adalah kuota per identitas di guard_request().
 * Angka-angka ini adalah metrik kanal yang bersifat indikatif, bukan angka
 * teraudit — dan dicatat begitu di docs/RUNBOOK.md.
 */
export function hashSesi(clientId: string): string {
  const salt = process.env.LEAD_IP_SALT
  if (!salt) throw new Error("LEAD_IP_SALT belum diatur.")
  return createHash("sha256").update(`sesi:${clientId}${salt}`).digest("hex").slice(0, 32)
}
