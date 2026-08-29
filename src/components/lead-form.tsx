"use client"

import { useState, useTransition } from "react"
import { AlertCircle, CheckCircle2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { kirimProspek } from "@/app/actions/lead"

/**
 * Teks persetujuan versi v1 — PRD §13.2, kata demi kata.
 * Setiap perubahan wajib menaikkan versi di src/app/actions/lead.ts agar
 * prospek lama tetap membawa versi yang benar-benar mereka setujui.
 */
const TEKS_PERSETUJUAN =
  "Saya bersedia dihubungi oleh petugas BRI atau pengembang perumahan terkait informasi KPR bersubsidi untuk perumahan yang saya pilih. Data saya (nama, nomor telepon, dan email) digunakan hanya untuk keperluan tersebut, tidak dibagikan kepada pihak lain, dan dapat saya minta hapus kapan saja melalui kontak yang tertera."

export default function LeadForm({
  housingId,
  housingName,
}: {
  housingId: string
  housingName: string
}) {
  const [error, setError] = useState("")
  const [terkirim, setTerkirim] = useState(false)
  const [pending, start] = useTransition()

  if (terkirim) {
    return (
      <div className="rounded-2xl border border-ok/25 bg-ok-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-ok" />
        <p className="mt-3 font-semibold text-foreground">Terima kasih, minat Anda tercatat.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Petugas akan menghubungi Anda di nomor yang dicantumkan.
        </p>
      </div>
    )
  }

  return (
    <form
      action={(fd) => {
        setError("")
        start(async () => {
          const h = await kirimProspek(fd)
          if (h.ok) setTerkirim(true)
          else setError(h.error)
        })
      }}
      className="space-y-4"
    >
      <input type="hidden" name="housing_id" value={housingId} />

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Nama lengkap</span>
          <Input name="name" required minLength={2} maxLength={120} placeholder="Nama Anda" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Nomor telepon</span>
          <Input name="phone" required inputMode="tel" placeholder="0812 3456 7890" />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-foreground">
          Email <span className="font-normal text-muted-foreground">(opsional)</span>
        </span>
        <Input name="email" type="email" placeholder="nama@email.com" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-foreground">
          Pesan <span className="font-normal text-muted-foreground">(opsional)</span>
        </span>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          placeholder={`Pertanyaan Anda tentang ${housingName}`}
          className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </label>

      {/* Tidak tercentang secara bawaan. UU PDP mensyaratkan tindakan afirmatif,
          dan basis data menolak prospek tanpa jejak persetujuan. */}
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary p-4">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-input"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">{TEKS_PERSETUJUAN}</span>
      </label>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Mengirim…" : (<><Send className="mr-2 h-4 w-4" /> Kirim minat</>)}
      </Button>
    </form>
  )
}
