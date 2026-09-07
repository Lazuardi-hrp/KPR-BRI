import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

/**
 * Klien untuk pembacaan publik (RSC).
 *
 * Sengaja TIDAK memakai @supabase/ssr: createServerClient memanggil cookies(),
 * yang membuat rute menjadi dinamis dan mematikan `export const revalidate`.
 * Halaman publik tidak butuh sesi — kebijakan housings_read_public berlaku
 * untuk peran `anon`. @supabase/ssr dipakai khusus di /admin.
 */
export function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        // Alirkan setiap GET PostgREST lewat cache fetch Next agar
        // revalidateTag('housings') bisa membatalkannya saat admin menyimpan.
        fetch: (url, options) =>
          fetch(url as RequestInfo, {
            ...options,
            next: { tags: ["housings"], revalidate: 300 },
          }),
      },
    },
  )
}
