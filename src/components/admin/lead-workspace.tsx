"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, StickyNote, UserCheck } from "lucide-react"

import {
  ubahStatusProspek,
  tugaskanProspek,
  tambahCatatanProspek,
} from "@/app/admin/actions"
import { URUTAN_STATUS, LABEL_STATUS, type StatusProspek } from "@/lib/lead-status"

type Staf = { id: string; full_name: string; role: string }

/**
 * Panel kerja satu prospek: pindahkan tahap, tugaskan, catat hasil.
 *
 * Ketiganya berada dalam satu komponen karena selalu dipakai berurutan dalam
 * satu percakapan telepon — menelepon, memutuskan tahapnya, lalu mencatat apa
 * yang dikatakan orangnya.
 */
export default function LeadWorkspace({
  id,
  status,
  ditugaskanKe,
  staf,
}: {
  id: string
  status: StatusProspek
  ditugaskanKe: string | null
  staf: Staf[]
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const [catatan, setCatatan] = useState("")
  const router = useRouter()

  const jalankan = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError("")
    start(async () => {
      const h = await fn()
      if (!h.ok) setError(h.error ?? "Gagal.")
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-e2">
      <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
        Tindak lanjut
      </h2>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {/* ── Tahap ───────────────────────────────────────────────────── */}
      <fieldset disabled={pending}>
        <legend className="text-xs font-semibold text-muted-foreground">Tahap</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {URUTAN_STATUS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => status !== s && jalankan(() => ubahStatusProspek(id, s))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {LABEL_STATUS[s]}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ── Penugasan ───────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="tugaskan"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <UserCheck className="h-3.5 w-3.5" aria-hidden /> Petugas
        </label>
        <select
          id="tugaskan"
          disabled={pending}
          value={ditugaskanKe ?? ""}
          onChange={(e) =>
            jalankan(() => tugaskanProspek(id, e.target.value === "" ? null : e.target.value))
          }
          className="mt-2 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">— belum ditugaskan —</option>
          {staf.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name || s.id.slice(0, 8)} ({s.role})
            </option>
          ))}
        </select>
      </div>

      {/* ── Catatan ─────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="catatan"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <StickyNote className="h-3.5 w-3.5" aria-hidden /> Catatan tindak lanjut
        </label>
        <textarea
          id="catatan"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={3}
          placeholder="Hasil percakapan, kesepakatan, atau kendala…"
          className="mt-2 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          disabled={pending || catatan.trim().length < 2}
          onClick={() =>
            jalankan(async () => {
              const h = await tambahCatatanProspek(id, catatan)
              if (h.ok) setCatatan("")
              return h
            })
          }
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Simpan catatan
        </button>
      </div>
    </div>
  )
}
