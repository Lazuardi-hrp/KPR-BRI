"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"

import { createAnonClient } from "@/lib/supabase/anon"
import { LeadSchema } from "@/lib/schemas/lead"

export type HasilLead = { ok: true } | { ok: false; error: string }

/** Versi teks persetujuan yang berlaku (PRD §13.2). Naikkan bila teksnya berubah. */
const VERSI_PERSETUJUAN = "v1"

/**
 * Hash IP pemanggil.
 *
 * IP mentah tidak pernah disimpan (PRD §9.4, §13.1) — yang disimpan hanya
 * sha256(ip + garam), cukup untuk rate limit tetapi bukan pengenal langsung.
 *
 * Nilai ini WAJIB terisi: submit_lead melewati pemeriksaan rate limit
 * sepenuhnya bila p_ip_hash null. Karena itu, ketika IP tidak terbaca sekalipun,
 * fungsi ini tetap mengembalikan hash — memakai penanda konstan — sehingga
 * jendela 3-per-jam tetap berlaku alih-alih terbuka lebar.
 */
async function hashIp(): Promise<string> {
  const h = await headers()
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "ip-tidak-diketahui"

  const salt = process.env.LEAD_IP_SALT
  if (!salt) throw new Error("LEAD_IP_SALT belum diatur.")
  return createHash("sha256").update(`${ip}${salt}`).digest("hex")
}

export async function kirimProspek(formData: FormData): Promise<HasilLead> {
  const parsed = LeadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian belum lengkap." }
  }
  const v = parsed.data

  const h = await headers()
  const supabase = createAnonClient()

  const { error } = await supabase.rpc("submit_lead", {
    p_housing_id: v.housing_id,
    p_name: v.name,
    p_phone: v.phone,
    p_email: v.email ?? undefined,
    p_message: v.message ?? undefined,
    p_consent_version: VERSI_PERSETUJUAN,
    p_ip_hash: await hashIp(),
    p_user_agent: h.get("user-agent")?.slice(0, 400) ?? undefined,
  })

  if (error) {
    // submit_lead sudah memakai bahasa Indonesia untuk kedua galat yang
    // ditujukan ke pengguna, jadi pesannya diteruskan apa adanya.
    if (error.code === "P0001") return { ok: false, error: "Terlalu banyak pengajuan dari jaringan ini. Coba lagi dalam satu jam." }
    if (error.code === "P0002") return { ok: false, error: "Perumahan ini sedang tidak tersedia." }
    return { ok: false, error: "Gagal mengirim. Coba beberapa saat lagi." }
  }

  return { ok: true }
}
