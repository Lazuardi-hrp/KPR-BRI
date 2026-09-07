"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, BadgeCheck, Check, Loader2, RefreshCw } from "lucide-react"

import { tandaiPerluPembaruan, verifikasiPerumahan } from "@/app/admin/actions"
import { formatDateID } from "@/lib/format"

/**
 * Daftar periksa verifikasi.
 *
 * Bidang tidak dicentang otomatis. Formulir yang datang dalam keadaan
 * "semua sudah benar" mengubah verifikasi menjadi satu klik tanpa membaca —
 * persis kebiasaan yang membuat label terverifikasi kehilangan artinya.
 * Petugas harus menyatakan tiap bidang sendiri.
 */

export type BidangPeriksa = {
  key: string
  label: string
  nilai: string
  /** Berubah sejak bidang ini terakhir diperiksa. */
  berubah: boolean
  terakhirDicek: string | null
}

export default function VerificationForm({
  housingId,
  bidang,
}: {
  housingId: string
  bidang: BidangPeriksa[]
}) {
  const [dicentang, setDicentang] = useState<Set<string>>(new Set())
  const [catatan, setCatatan] = useState("")
  const [hari, setHari] = useState(30)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()

  const semua = dicentang.size === bidang.length
  const sebagian = dicentang.size > 0 && !semua

  function toggle(k: string) {
    setDicentang((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-e2">
      <div>
        <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
          Daftar periksa
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Centang hanya yang benar-benar Anda periksa. Yang tercatat adalah pernyataan
          Anda, lengkap dengan nama dan waktunya.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <ul className="divide-y divide-border">
        {bidang.map((b) => {
          const aktif = dicentang.has(b.key)
          return (
            <li key={b.key}>
              <label className="flex cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={() => toggle(b.key)}
                  disabled={pending}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{b.label}</span>
                    {b.berubah && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-bold text-warn">
                        <AlertTriangle className="h-3 w-3" aria-hidden /> Berubah sejak dicek
                      </span>
                    )}
                  </span>
                  <span className="numeric mt-0.5 block break-words text-sm text-muted-foreground">
                    {b.nilai}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {b.terakhirDicek
                      ? `Terakhir dicek ${formatDateID(b.terakhirDicek)}`
                      : "Belum pernah dicek"}
                  </span>
                </span>
                {aktif && <Check className="mt-1 h-4 w-4 shrink-0 text-ok" aria-hidden />}
              </label>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setDicentang(new Set(bidang.map((b) => b.key)))}
          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Centang semua
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setDicentang(new Set())}
          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Kosongkan
        </button>
      </div>

      <div>
        <label htmlFor="tinjau" className="text-xs font-semibold text-muted-foreground">
          Tinjau ulang dalam
        </label>
        <select
          id="tinjau"
          value={hari}
          disabled={pending}
          onChange={(e) => setHari(Number(e.target.value))}
          className="mt-2 h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value={7}>7 hari</option>
          <option value={14}>14 hari</option>
          <option value={30}>30 hari</option>
          <option value={60}>60 hari</option>
          <option value={90}>90 hari</option>
        </select>
      </div>

      <div>
        <label htmlFor="catatan-verif" className="text-xs font-semibold text-muted-foreground">
          Catatan <span className="font-normal">(internal, tidak tampil ke pengunjung)</span>
        </label>
        <textarea
          id="catatan-verif"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={3}
          disabled={pending}
          placeholder="Sumber konfirmasi, siapa yang dihubungi, temuan…"
          className="mt-2 w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {sebagian && (
        <p className="rounded-xl bg-warn-50 p-3 text-xs leading-relaxed text-warn">
          Verifikasi sebagian menyimpan status <strong>perlu pembaruan</strong>, bukan
          terverifikasi. Pengunjung tidak akan melihat centang hijau untuk properti yang
          sebagian datanya belum sempat dicek.
        </p>
      )}

      {/* Dua hasil, bukan satu. Petugas yang menemukan data meragukan perlu
          jalan keluar yang jujur selain mencentang sebagian — lihat
          tandaiPerluPembaruan di app/admin/actions.ts. */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={pending || dicentang.size === 0}
          onClick={() => {
            setError("")
            start(async () => {
              const h = await verifikasiPerumahan(
                housingId,
                Array.from(dicentang),
                catatan,
                hari,
              )
              if (!h.ok) setError(h.error)
              else {
                setDicentang(new Set())
                setCatatan("")
                router.refresh()
              }
            })
          }}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <BadgeCheck className="h-4 w-4" aria-hidden />
          )}
          {semua ? "Verifikasi properti" : `Simpan pemeriksaan (${dicentang.size} bidang)`}
        </button>

        <button
          type="button"
          disabled={pending || catatan.trim().length < 5}
          onClick={() => {
            setError("")
            start(async () => {
              const h = await tandaiPerluPembaruan(housingId, catatan)
              if (!h.ok) setError(h.error)
              else {
                setDicentang(new Set())
                setCatatan("")
                router.refresh()
              }
            })
          }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-warn/40 bg-warn-50 px-6 text-sm font-semibold text-warn transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Tandai perlu pembaruan
        </button>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Menandai perlu pembaruan mengabaikan centang di atas dan{" "}
          <strong className="font-semibold">wajib disertai catatan</strong> — penanda tanpa
          alasan hanya memindahkan pertanyaannya ke petugas berikutnya.
        </p>
      </div>
    </div>
  )
}
