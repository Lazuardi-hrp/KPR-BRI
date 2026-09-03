import Link from "next/link"
import { ShieldCheck, Inbox, Clock, Flag } from "lucide-react"

import { getDaftarProspek, getMetrikProspek, type FilterProspek } from "@/lib/queries/admin"
import { formatDateTimeID, formatIDR } from "@/lib/format"
import {
  URUTAN_STATUS,
  LABEL_STATUS,
  LENCANA_STATUS,
  LABEL_JENIS,
  terlambat,
  type StatusProspek,
} from "@/lib/lead-status"
import LeadActions from "@/components/admin/lead-actions"

export const dynamic = "force-dynamic"

type Params = Promise<{
  status?: string
  terlambat?: string
  belum_ditugaskan?: string
  q?: string
}>

/** Menyusun ulang querystring dengan satu kunci diubah. */
function tautan(kini: Record<string, string | undefined>, ubah: Record<string, string | null>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...kini, ...ubah })) {
    if (v) p.set(k, v)
  }
  const s = p.toString()
  return s ? `/admin/prospek?${s}` : "/admin/prospek"
}

export default async function KotakMasukProspek({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams

  const statusTerpilih = URUTAN_STATUS.includes(sp.status as StatusProspek)
    ? (sp.status as StatusProspek)
    : undefined

  const filter: FilterProspek = {
    status: statusTerpilih,
    terlambat: sp.terlambat === "1",
    belumDitugaskan: sp.belum_ditugaskan === "1",
    q: sp.q,
  }

  const [rows, metrik] = await Promise.all([getDaftarProspek(filter), getMetrikProspek()])

  const kini = {
    status: sp.status,
    terlambat: sp.terlambat,
    belum_ditugaskan: sp.belum_ditugaskan,
    q: sp.q,
  }
  const adaFilter = Boolean(statusTerpilih || filter.terlambat || filter.belumDitugaskan || sp.q)

  const cip =
    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Prospek
        </h1>
        <p className="mt-1 text-muted-foreground">
          {metrik.total} total · {metrik.baru} baru
          {metrik.terlambat > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-danger">
                {metrik.terlambat} lewat batas waktu
              </span>
            </>
          )}
        </p>
      </div>

      {/* ── Penyaring ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Link
            href={tautan(kini, { status: null, terlambat: null, belum_ditugaskan: null })}
            className={`${cip} ${
              !adaFilter
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua
          </Link>
          {URUTAN_STATUS.map((s) => (
            <Link
              key={s}
              href={tautan(kini, {
                status: statusTerpilih === s ? null : s,
                terlambat: null,
                belum_ditugaskan: null,
              })}
              className={`${cip} ${
                statusTerpilih === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {LABEL_STATUS[s]}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Link
            href={tautan(kini, {
              terlambat: filter.terlambat ? null : "1",
              status: null,
              belum_ditugaskan: null,
            })}
            className={`${cip} inline-flex items-center gap-1.5 ${
              filter.terlambat
                ? "bg-danger text-white"
                : "bg-danger-50 text-danger hover:bg-danger/15"
            }`}
          >
            <Clock className="h-3 w-3" aria-hidden /> Lewat batas waktu ({metrik.terlambat})
          </Link>
          <Link
            href={tautan(kini, {
              belum_ditugaskan: filter.belumDitugaskan ? null : "1",
              status: null,
              terlambat: null,
            })}
            className={`${cip} inline-flex items-center gap-1.5 ${
              filter.belumDitugaskan
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Belum ditugaskan ({metrik.belumDitugaskan})
          </Link>
        </div>

        <form action="/admin/prospek" className="flex gap-2">
          {statusTerpilih && <input type="hidden" name="status" value={statusTerpilih} />}
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari nama atau nomor telepon…"
            className="h-11 flex-1 rounded-2xl border border-input bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="h-11 shrink-0 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cari
          </button>
        </form>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-accent p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-foreground">
          Halaman ini memuat data pribadi (UU No. 27 Tahun 2022). Gunakan hanya untuk
          menindaklanjuti minat KPR yang disetujui pemiliknya. Data terhapus otomatis
          setelah masa retensi berakhir dan prospeknya sudah selesai.
        </p>
      </div>

      {/* ── Daftar ────────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-e2">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-semibold text-foreground">
            {adaFilter ? "Tidak ada prospek yang cocok" : "Belum ada prospek masuk"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {adaFilter ? (
              <Link href="/admin/prospek" className="text-primary hover:underline">
                Hapus penyaring
              </Link>
            ) : (
              "Prospek muncul di sini begitu pengunjung mengirim formulir minat."
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((l) => {
            const lewat = terlambat(l.status, l.first_contact_due_at)
            return (
              <li
                key={l.id}
                className={`rounded-2xl border bg-white p-5 shadow-e2 ${
                  lewat ? "border-danger/40" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Penanda belum dihubungi: yang paling menentukan di layar
                          ini, jadi ia mendahului nama. */}
                      {lewat && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white"
                          title="Melewati batas waktu kontak pertama"
                        >
                          <Clock className="h-3 w-3" aria-hidden /> Terlambat
                        </span>
                      )}
                      <Link
                        href={`/admin/prospek/${l.id}`}
                        className="font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {l.name}
                      </Link>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LENCANA_STATUS[l.status]}`}
                      >
                        {LABEL_STATUS[l.status]}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {LABEL_JENIS[l.lead_kind]}
                      </span>
                      {l.is_flagged && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-bold text-warn"
                          title={`Skor risiko ${l.risk_score}`}
                        >
                          <Flag className="h-3 w-3" aria-hidden /> Ditandai
                        </span>
                      )}
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
                      {l.source_page && <> · dari {l.source_page}</>}
                    </p>

                    {(l.price_snapshot != null || l.est_monthly_payment != null) && (
                      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                        {l.price_snapshot != null && (
                          <div className="flex gap-1.5">
                            <dt className="text-muted-foreground">Harga saat itu</dt>
                            <dd className="numeric font-semibold text-foreground">
                              {formatIDR(l.price_snapshot)}
                            </dd>
                          </div>
                        )}
                        {l.est_monthly_payment != null && (
                          <div className="flex gap-1.5">
                            <dt className="text-muted-foreground">Estimasi angsuran</dt>
                            <dd className="numeric font-semibold text-primary">
                              {formatIDR(l.est_monthly_payment)}/bln
                            </dd>
                          </div>
                        )}
                        {l.tenor_years != null && (
                          <div className="flex gap-1.5">
                            <dt className="text-muted-foreground">Tenor</dt>
                            <dd className="numeric font-semibold text-foreground">
                              {l.tenor_years} th
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {l.message && (
                      <p className="mt-2 rounded-xl bg-secondary p-3 text-sm text-foreground">
                        {l.message}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeID(l.created_at)}
                    </p>
                    <div className="mt-3">
                      <LeadActions id={l.id} sekarang={l.status} />
                    </div>
                    <Link
                      href={`/admin/prospek/${l.id}`}
                      className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      Buka detail
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
