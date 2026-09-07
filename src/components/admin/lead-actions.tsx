"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { ubahStatusProspek } from "@/app/admin/actions"
import {
  URUTAN_STATUS,
  LABEL_STATUS,
  tahapBerikut,
  type StatusProspek,
} from "@/lib/lead-status"

/**
 * Aksi cepat pada satu baris daftar prospek.
 *
 * Tombol "tahap berikutnya" ada karena jalur yang benar-benar sering dipakai
 * adalah maju satu langkah setelah menelepon. Pemilih penuh tetap ada di
 * sebelahnya untuk lompatan yang tidak berurutan.
 */
export default function LeadActions({
  id,
  sekarang,
}: {
  id: string
  sekarang: StatusProspek
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const router = useRouter()

  const berikut = tahapBerikut(sekarang)

  const pindah = (ke: StatusProspek) => {
    setError("")
    start(async () => {
      const h = await ubahStatusProspek(id, ke)
      if (!h.ok) setError(h.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {berikut && (
          <button
            type="button"
            disabled={pending}
            onClick={() => pindah(berikut)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LABEL_STATUS[berikut]}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </button>
        )}

        <select
          value={sekarang}
          disabled={pending}
          onChange={(e) => pindah(e.target.value as StatusProspek)}
          className="h-9 rounded-full border border-input bg-white px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Ubah status prospek"
        >
          {URUTAN_STATUS.map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS[s]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-right text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
