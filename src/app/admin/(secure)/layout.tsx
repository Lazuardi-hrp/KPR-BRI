import Link from "next/link"
import { redirect } from "next/navigation"
import { LayoutDashboard, Home, Inbox, Settings, LogOut, ShieldCheck } from "lucide-react"

import { getSesiStaf } from "@/lib/auth"
import { keluar } from "@/app/admin/actions"

const menu = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/perumahan", label: "Perumahan", icon: Home },
  { href: "/admin/prospek", label: "Prospek", icon: Inbox },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
]

/**
 * Shell admin bersesi.
 *
 * Berada di route group (secure) — BUKAN langsung di src/app/admin/ — supaya
 * /admin/login tidak ikut terbungkus. Ketika layout ini membungkus halaman
 * login, penjagaannya memicu perulangan tak berujung: login -> tanpa sesi ->
 * alihkan ke login -> layout jalan lagi. Terdeteksi sebagai
 * ERR_TOO_MANY_REDIRECTS saat uji browser.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesi = await getSesiStaf()

  // Middleware sudah mengalihkan tamu, tetapi middleware bisa dilewati dan
  // hanya memeriksa "ada sesi", bukan "punya peran". Ini pemeriksaan kedua;
  // RLS di basis data adalah yang ketiga dan yang menentukan.
  if (!sesi) redirect("/admin/login")

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
              KPR BRI
            </span>
          </Link>

          <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <m.icon className="h-4 w-4" />
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight text-foreground">
                {sesi.fullName || sesi.email}
              </p>
              <p className="text-xs capitalize text-muted-foreground">{sesi.role}</p>
            </div>
            <form action={keluar}>
              <button
                type="submit"
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
