import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Menyegarkan sesi Supabase dan menjaga /admin.
 *
 * Penjagaan di sini hanyalah lapis pertama demi pengalaman pengguna (arahkan
 * tamu ke login alih-alih menampilkan halaman kosong). Otorisasi yang
 * sebenarnya ada di RLS: bahkan bila middleware dilewati, basis data tetap
 * menolak. Middleware tidak pernah menjadi satu-satunya penjaga.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // Jangan sisipkan kode apa pun antara createServerClient dan getUser():
  // kekeliruan kecil di sini membuat pengguna ter-logout secara acak.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const diHalamanLogin = path === "/admin/login"

  if (!user && !diHalamanLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    url.searchParams.set("lanjut", path)
    return NextResponse.redirect(url)
  }

  if (user && diHalamanLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*"],
}
