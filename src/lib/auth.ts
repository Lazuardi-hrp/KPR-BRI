import "server-only"

import { createClient } from "@/lib/supabase/server"

export type Sesi = {
  userId: string
  email: string | null
  role: "admin" | "pengembang" | "viewer"
  developerId: string | null
  fullName: string
}

/**
 * Sesi staf saat ini, atau null.
 *
 * Selalu memakai getUser() — bukan getSession() — karena getUser() memverifikasi
 * token ke server Auth, sedangkan getSession() hanya membaca cookie yang bisa
 * dipalsukan. Ini persis kekeliruan yang membuat admin-auth.ts lama
 * (`localStorage.adminLogged === "true"`) tidak berarti apa-apa.
 */
export async function getSesi(): Promise<Sesi | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, developer_id, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (!profil || !profil.is_active) return null

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profil.role,
    developerId: profil.developer_id,
    fullName: profil.full_name,
  }
}

/** Sesi staf (admin atau pengembang), atau null bila bukan keduanya. */
export async function getSesiStaf(): Promise<Sesi | null> {
  const s = await getSesi()
  return s && (s.role === "admin" || s.role === "pengembang") ? s : null
}

export async function wajibAdmin(): Promise<Sesi> {
  const s = await getSesi()
  if (!s || s.role !== "admin") throw new Error("Akses ditolak: butuh peran admin.")
  return s
}
