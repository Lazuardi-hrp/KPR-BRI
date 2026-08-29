"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { ubahStatusPerumahan, hapusPerumahan } from "@/app/admin/actions"

export default function StatusActions({
  id,
  status,
  bolehHapus,
}: {
  id: string
  status: "draft" | "published" | "archived"
  bolehHapus: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const router = useRouter()

  const jalankan = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError("")
    start(async () => {
      const h = await fn()
      if (!h.ok) setError(h.error ?? "Gagal.")
      else router.refresh()
    })
  }

  const tombol =
    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error && (
        <p role="alert" className="w-full text-right text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {status !== "published" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => jalankan(() => ubahStatusPerumahan(id, "published"))}
          className={`${tombol} bg-ok-50 text-ok hover:bg-ok/15`}
        >
          Terbitkan
        </button>
      )}
      {status === "published" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => jalankan(() => ubahStatusPerumahan(id, "draft"))}
          className={`${tombol} bg-secondary text-muted-foreground hover:text-foreground`}
        >
          Jadikan draft
        </button>
      )}
      {status !== "archived" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => jalankan(() => ubahStatusPerumahan(id, "archived"))}
          className={`${tombol} bg-warn-50 text-warn hover:bg-warn/15`}
        >
          Arsipkan
        </button>
      )}
      {bolehHapus && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Hapus perumahan ini? Data disimpan sebagai soft delete dan masih bisa dipulihkan lewat basis data.")) {
              jalankan(() => hapusPerumahan(id))
            }
          }}
          className={`${tombol} bg-danger-50 text-danger hover:bg-danger/15`}
        >
          Hapus
        </button>
      )}
    </div>
  )
}
