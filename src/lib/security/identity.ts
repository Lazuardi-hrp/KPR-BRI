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
