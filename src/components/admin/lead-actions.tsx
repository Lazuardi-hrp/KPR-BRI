"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { ubahStatusProspek, tambahCatatanProspek } from "@/app/admin/actions"

const status = ["baru", "dihubungi", "diproses", "selesai", "batal"] as const
type Status = (typeof status)[number]

export default function LeadActions({ id, sekarang }: { id: string; sekarang: Status }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const [catatan, setCatatan] = useState("")
  const [bukaCatatan, setBukaCatatan] = useState(false)
  const router = useRouter()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sekarang}
          disabled={pending}
          onChange={(e) => {
            const nilai = e.target.value as Status
            setError("")
            start(async () => {
              const h = await ubahStatusProspek(id, nilai)
              if (!h.ok) setError(h.error)
              else router.refresh()
            })
          }}
          className="h-9 rounded-full border border-input bg-white px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Ubah status prospek"
        >
          {status.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setBukaCatatan((v) => !v)}
          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {bukaCatatan ? "Tutup" : "Catatan"}
        </button>
      </div>

      {bukaCatatan && (
        <div className="flex gap-2">
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Hasil tindak lanjut…"
            className="h-9 flex-1 rounded-xl border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            disabled={pending || catatan.trim().length < 2}
            onClick={() => {
              setError("")
              start(async () => {
                const h = await tambahCatatanProspek(id, catatan)
                if (!h.ok) setError(h.error)
                else {
                  setCatatan("")
                  setBukaCatatan(false)
                  router.refresh()
                }
              })
            }}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
