import { ShieldCheck, Inbox } from "lucide-react"

import { getDaftarProspek } from "@/lib/queries/admin"
import { formatDateTimeID, formatDateID } from "@/lib/format"
import LeadActions from "@/components/admin/lead-actions"

export const dynamic = "force-dynamic"

const lencana: Record<string, string> = {
  baru: "bg-accent text-primary",
  dihubungi: "bg-ok-50 text-ok",
  diproses: "bg-warn-50 text-warn",
  selesai: "bg-secondary text-muted-foreground",
  batal: "bg-danger-50 text-danger",
}

export default async function KotakMasukProspek() {
  const rows = await getDaftarProspek()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Prospek
        </h1>
        <p className="mt-1 text-muted-foreground">{rows.length} pengajuan minat</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-accent p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          Halaman ini memuat data pribadi (UU No. 27 Tahun 2022). Gunakan hanya untuk
          menindaklanjuti minat KPR yang disetujui pemiliknya. Data terhapus otomatis setelah
          masa retensi berakhir dan statusnya selesai atau batal.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-e2">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 font-semibold text-foreground">Belum ada prospek masuk</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prospek muncul di sini begitu pengunjung mengirim formulir minat.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((l) => (
            <li key={l.id} className="rounded-2xl border border-border bg-white p-5 shadow-e2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{l.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lencana[l.status]}`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="numeric mt-1 text-sm text-foreground">
                    <a href={`tel:${l.phone}`} className="hover:text-primary">
                      {l.phone}
                    </a>
                    {l.email && (
                      <>
                        {" · "}
                        <a href={`mailto:${l.email}`} className="hover:text-primary">
                          {l.email}
                        </a>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Minat pada{" "}
                    <span className="font-medium text-foreground">
                      {l.housing?.name ?? "— perumahan terhapus —"}
                    </span>
                  </p>
                  {l.message && (
                    <p className="mt-2 rounded-xl bg-secondary p-3 text-sm text-foreground">
                      {l.message}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">{formatDateTimeID(l.created_at)}</p>
                  <div className="mt-3">
                    <LeadActions id={l.id} sekarang={l.status} />
                  </div>
                </div>
              </div>

              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                Persetujuan {l.consent_version} tercatat {formatDateTimeID(l.consent_at)} · dihapus
                otomatis setelah {formatDateID(l.purge_after)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
