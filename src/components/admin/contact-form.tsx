"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { simpanKontak } from "@/app/admin/actions"

export default function ContactForm({
  housingId,
  awal,
}: {
  housingId: string
  awal: { name: string; phone: string; email: string; role_label: string }
}) {
  const [error, setError] = useState("")
  const [sukses, setSukses] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  return (
    <form
      action={(fd) => {
        setError("")
        setSukses(false)
        start(async () => {
          const h = await simpanKontak(housingId, fd)
          if (!h.ok) setError(h.error)
          else {
            setSukses(true)
            router.refresh()
          }
        })
      }}
      className="space-y-4"
    >
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}
      {sukses && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-ok/25 bg-ok-50 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
          <p className="text-sm font-medium text-ok">Kontak tersimpan.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Nama</span>
          <Input name="name" required defaultValue={awal.name} maxLength={120} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Telepon</span>
          <Input name="phone" defaultValue={awal.phone} placeholder="0812 3456 7890" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Email</span>
          <Input name="email" type="email" defaultValue={awal.email} placeholder="belum diisi" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Jabatan</span>
          <Input name="role_label" defaultValue={awal.role_label} maxLength={60} />
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan kontak"}
      </Button>
    </form>
  )
}
