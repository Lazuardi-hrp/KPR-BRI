import Link from "next/link"
import { Plus, TriangleAlert } from "lucide-react"

import { getDaftarPerumahanAdmin } from "@/lib/queries/admin"
import { getSesiStaf } from "@/lib/auth"
import { formatIDR, formatDateTimeID } from "@/lib/format"
import StatusActions from "@/components/admin/status-actions"

export const dynamic = "force-dynamic"

const lencana = {
  published: "bg-ok-50 text-ok",
  draft: "bg-secondary text-muted-foreground",
  archived: "bg-warn-50 text-warn",
} as const

const namaStatus = { published: "Terbit", draft: "Draft", archived: "Arsip" } as const

export default async function DaftarPerumahan() {
  const [rows, sesi] = await Promise.all([getDaftarPerumahanAdmin(), getSesiStaf()])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
            Perumahan
          </h1>
          <p className="mt-1 text-muted-foreground">{rows.length} data terdaftar</p>
        </div>
        <Link
          href="/admin/perumahan/baru"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" /> Tambah perumahan
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-e2">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-semibold text-muted-foreground">Nama</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Tersedia</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Harga</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Diperbarui</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((h) => (
              <tr key={h.id} className="align-middle">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/perumahan/${h.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {h.name}
                  </Link>
                  {h.needs_review && (
                    <span
                      className="ml-2 inline-flex items-center gap-1 rounded-full bg-warn-50 px-2 py-0.5 text-xs font-semibold text-warn"
                      title="Angka masih turunan dari data lama, belum diverifikasi tim BRI"
                    >
                      <TriangleAlert className="h-3 w-3" /> perlu ditinjau
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lencana[h.status]}`}>
                    {namaStatus[h.status]}
                  </span>
                </td>
                <td className="numeric px-4 py-3 text-right text-foreground">
                  {h.available_units ?? 0}
                  <span className="text-muted-foreground"> / {h.total_units ?? 0}</span>
                </td>
                <td className="numeric px-4 py-3 text-right text-foreground">
                  {h.price_min != null ? formatIDR(Number(h.price_min)) : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDateTimeID(h.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <StatusActions id={h.id} status={h.status} bolehHapus={sesi?.role === "admin"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
