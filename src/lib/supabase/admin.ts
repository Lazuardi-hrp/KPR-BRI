import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

/**
 * Klien service_role — MELEWATI RLS SEPENUHNYA.
 *
 * Hanya boleh dipakai di Server Action / Route Handler yang sudah memverifikasi
 * pemanggilnya admin. Impor "server-only" di atas membuat build gagal bila
 * berkas ini pernah tersentuh bundel klien (PRD R-3).
 *
 * Untuk operasi admin biasa, pakai createClient() dari ./server — sesi pengguna
 * plus RLS sudah cukup dan jauh lebih aman. Sisakan ini untuk yang benar-benar
 * perlu melewati RLS.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diatur. Isi di .env.local — jangan pernah dengan awalan NEXT_PUBLIC_.",
    )
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
