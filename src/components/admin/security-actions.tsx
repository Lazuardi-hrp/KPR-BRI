"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Ban, Check, RotateCcw, Unlock } from "lucide-react"

import {
  blokirIdentitas,
  bukaBlokirIdentitas,
  tandaiLonjakanSelesai,
  tandaiPeristiwaSelesai,
} from "@/app/admin/actions"

export function TombolBlokir({ ipHash }: { ipHash: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              "Blokir identitas ini selama 24 jam?\n\nSatu hash bisa mewakili banyak orang di balik NAT operator seluler. Blokir hanya bila polanya jelas otomatis.",
            )
          )
            return
          setError("")
          start(async () => {
            const h = await blokirIdentitas(ipHash, "Diblokir manual oleh admin", 24)
            if (!h.ok) setError(h.error)
            else router.refresh()
          })
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-danger-50 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/15 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Ban className="h-3 w-3" aria-hidden /> Blokir 24 jam
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </>
  )
}

export function TombolBukaBlokir({ ipHash }: { ipHash: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError("")
          start(async () => {
            const h = await bukaBlokirIdentitas(ipHash)
            if (!h.ok) setError(h.error)
            else router.refresh()
          })
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Unlock className="h-3 w-3" aria-hidden /> Buka blokir
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </>
  )
}

/**
 * Menutup atau membuka kembali satu temuan.
 *
 * Dibuat dua arah dengan sengaja. Tombol "selesai" satu arah membuat admin
 * ragu menekannya — sekali salah klik, temuannya hilang dari pandangan tanpa
 * cara mengembalikannya, dan keraguan itu berakhir dengan daftar yang tidak
 * pernah ditutup sama sekali.
 */
export function TombolSelesai({
  id,
  selesai,
  jenis = "peristiwa",
}: {
  id: number
  selesai: boolean
  jenis?: "peristiwa" | "lonjakan"
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const router = useRouter()

  const tandai = jenis === "lonjakan" ? tandaiLonjakanSelesai : tandaiPeristiwaSelesai

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError("")
          start(async () => {
            const h = await tandai(id, !selesai)
            if (!h.ok) setError(h.error)
            else router.refresh()
          })
        }}
        className={
          selesai
            ? "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            : "inline-flex items-center gap-1.5 rounded-full bg-ok-50 px-3 py-1.5 text-xs font-semibold text-ok transition-colors hover:bg-ok/15 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        {selesai ? (
          <>
            <RotateCcw className="h-3 w-3" aria-hidden /> Buka lagi
          </>
        ) : (
          <>
            <Check className="h-3 w-3" aria-hidden /> Tandai selesai
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </>
  )
}
