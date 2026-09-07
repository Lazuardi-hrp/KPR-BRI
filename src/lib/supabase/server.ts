import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"

/**
 * Klien bersesi untuk RSC dan Server Action di /admin.
 * Memanggil cookies(), jadi rute yang memakainya selalu dinamis — itu memang
 * yang diinginkan untuk halaman admin.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Dipanggil dari Server Component — middleware yang menyegarkan sesi.
          }
        },
      },
    },
  )
}
