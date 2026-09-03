"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Check, Home, ShieldAlert, Inbox, Info } from "lucide-react"

import {
  tandaiNotifikasiDibaca,
  tandaiSemuaNotifikasiDibaca,
} from "@/app/admin/actions"
import type { Notifikasi } from "@/lib/queries/admin"
import { formatDateTimeID } from "@/lib/format"

const IKON = {
  prospek_baru: Inbox,
  verifikasi: Home,
  keamanan: ShieldAlert,
  sistem: Info,
} as const

const WARNA = ["text-muted-foreground", "text-warn", "text-danger"] as const

export default function NotificationBell({
  awal,
  belumDibaca,
}: {
  awal: Notifikasi[]
  belumDibaca: number
}) {
  const [buka, setBuka] = useState(false)
  const [, start] = useTransition()
  const router = useRouter()
  const kotak = useRef<HTMLDivElement>(null)

  // Menutup saat klik di luar dan saat Escape. Keduanya diharapkan dari
  // menu semacam ini, dan tanpa Escape panel ini menjadi perangkap papan ketik.
  useEffect(() => {
    if (!buka) return

    function klikLuar(e: MouseEvent) {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false)
    }
    function tombol(e: KeyboardEvent) {
      if (e.key === "Escape") setBuka(false)
    }

    document.addEventListener("mousedown", klikLuar)
    document.addEventListener("keydown", tombol)
    return () => {
      document.removeEventListener("mousedown", klikLuar)
      document.removeEventListener("keydown", tombol)
    }
  }, [buka])

  return (
    <div ref={kotak} className="relative">
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-haspopup="menu"
        aria-label={
          belumDibaca > 0 ? `Notifikasi, ${belumDibaca} belum dibaca` : "Notifikasi"
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {belumDibaca > 0 && (
          <span className="numeric absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {belumDibaca > 99 ? "99+" : belumDibaca}
          </span>
        )}
      </button>

      {buka && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-white shadow-e4"
        >
          <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-border bg-white px-4 py-3">
            <p className="text-sm font-bold text-foreground">Notifikasi</p>
            {belumDibaca > 0 && (
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    await tandaiSemuaNotifikasiDibaca()
                    router.refresh()
                  })
                }
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Check className="h-3 w-3" aria-hidden /> Tandai semua
              </button>
            )}
          </div>

          {awal.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada notifikasi.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {awal.map((n) => {
                const Ikon = IKON[n.kind] ?? Info
                const isi = (
                  <>
                    <span
                      className={`mt-0.5 shrink-0 ${WARNA[n.severity] ?? WARNA[0]}`}
                      aria-hidden
                    >
                      <Ikon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {formatDateTimeID(n.created_at)}
                      </span>
                    </span>
                    {!n.read_at && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        aria-label="Belum dibaca"
                      />
                    )}
                  </>
                )

                const kelas = `flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                  n.read_at ? "" : "bg-accent/40"
                }`

                const tandai = () =>
                  start(async () => {
                    if (!n.read_at) await tandaiNotifikasiDibaca(n.id)
                    router.refresh()
                  })

                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          setBuka(false)
                          tandai()
                        }}
                        className={kelas}
                      >
                        {isi}
                      </Link>
                    ) : (
                      <button type="button" onClick={tandai} className={kelas}>
                        {isi}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
