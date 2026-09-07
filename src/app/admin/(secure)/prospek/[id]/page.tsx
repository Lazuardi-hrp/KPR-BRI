import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, Flag, Mail, MessageCircle, Phone } from "lucide-react"

import { getProspek } from "@/lib/queries/admin"
import { formatDateTimeID, formatDateID, formatIDR } from "@/lib/format"
import { LABEL_STATUS, LENCANA_STATUS, LABEL_JENIS, terlambat } from "@/lib/lead-status"
import { LABEL_KEMAMPUAN, WARNA_KEMAMPUAN, type BandKemampuan } from "@/lib/kpr"
import LeadWorkspace from "@/components/admin/lead-workspace"
import { nomorWa, pesanPetugas } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold text-foreground">{children}</dd>
    </div>
  )
}

export default async function DetailProspek({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getProspek(id)
  if (!data) notFound()

  const { lead: l, catatan, riwayat, staf } = data
  const lewat = terlambat(l.status, l.first_contact_due_at)
  const wa = nomorWa(l.phone)

  // Balasan pertama sudah tersusun, bukan percakapan kosong.
  //
  // Petugas yang membuka WhatsApp dari sini biasanya sedang mengerjakan
  // sederet prospek berurutan; mengetik ulang nama perumahan dan angka
  // simulasi untuk masing-masing adalah persis pekerjaan yang membuat kontak
  // pertama tertunda melewati SLA-nya. Teksnya tetap bisa disunting sebelum
  // dikirim — WhatsApp hanya mengisinya, tidak mengirimkannya.
  const sapaan = encodeURIComponent(
    pesanPetugas({
      nama: l.name,
      perumahan: l.housing?.name ?? null,
      angsuran: l.est_monthly_payment,
      tenorTahun: l.tenor_years,
    }),
  )

  return (
    <div className="space-y-6">
      <Link
        href="/admin/prospek"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke kotak masuk
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
              {l.name}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${LENCANA_STATUS[l.status]}`}
            >
              {LABEL_STATUS[l.status]}
            </span>
            {l.is_flagged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warn-50 px-2.5 py-1 text-xs font-bold text-warn">
                <Flag className="h-3 w-3" aria-hidden /> Skor risiko {l.risk_score}
              </span>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            Masuk {formatDateTimeID(l.created_at)} · {LABEL_JENIS[l.lead_kind]}
            {l.source_page && ` · ${l.source_page}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`tel:${l.phone}`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Phone className="h-4 w-4" aria-hidden /> Telepon
          </a>
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${sapaan}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground hover:border-ok/40 hover:bg-ok-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageCircle className="h-4 w-4 text-ok" aria-hidden /> WhatsApp
            </a>
          )}
          {l.email && (
            <a
              href={`mailto:${l.email}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Mail className="h-4 w-4" aria-hidden /> Email
            </a>
          )}
        </div>
      </header>

      {lewat && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-50 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Melewati batas waktu kontak pertama</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Batas waktunya {formatDateTimeID(l.first_contact_due_at)} dan prospek ini
              masih berstatus baru.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {/* ── Data prospek ─────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
              Data prospek
            </h2>
            <dl className="mt-3 divide-y divide-border">
              <Baris label="Nama">{l.name}</Baris>
              <Baris label="Nomor telepon">
                <a href={`tel:${l.phone}`} className="numeric hover:text-primary">
                  {l.phone}
                </a>
              </Baris>
              <Baris label="Email">
                {l.email ? (
                  <a href={`mailto:${l.email}`} className="hover:text-primary">
                    {l.email}
                  </a>
                ) : (
                  <span className="font-normal text-muted-foreground">—</span>
                )}
              </Baris>
              <Baris label="Perumahan">
                {l.housing ? (
                  <Link
                    href={`/perumahan/${l.housing.slug}`}
                    className="hover:text-primary hover:underline"
                  >
                    {l.housing.name}
                  </Link>
                ) : (
                  <span className="font-normal text-muted-foreground">
                    — perumahan terhapus —
                  </span>
                )}
              </Baris>
              <Baris label="Asal">{LABEL_JENIS[l.lead_kind]}</Baris>
              {l.source_page && <Baris label="Halaman">{l.source_page}</Baris>}
            </dl>

            {l.message && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground">Pesan</p>
                <p className="mt-1.5 rounded-xl bg-secondary p-3 text-sm text-foreground">
                  {l.message}
                </p>
              </div>
            )}
          </section>

          {/* ── Simulasi yang dilihat calon pembeli ───────────────────── */}
          {(l.price_snapshot != null ||
            l.est_monthly_payment != null ||
            l.monthly_income != null) && (
            <section className="rounded-2xl border border-border bg-white p-5 shadow-e2">
              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
                Simulasi saat pengajuan
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Angka yang dilihat calon pembeli ketika ia mengirim minatnya. Sengaja
                tidak mengikuti perubahan harga setelahnya.
              </p>
              <dl className="mt-3 divide-y divide-border">
                {l.price_snapshot != null && (
                  <Baris label="Harga properti">
                    <span className="numeric">{formatIDR(l.price_snapshot)}</span>
                  </Baris>
                )}
                {l.est_monthly_payment != null && (
                  <Baris label="Estimasi angsuran">
                    <span className="numeric text-primary">
                      {formatIDR(l.est_monthly_payment)} / bulan
                    </span>
                  </Baris>
                )}
                {l.tenor_years != null && (
                  <Baris label="Tenor">
                    <span className="numeric">{l.tenor_years} tahun</span>
                  </Baris>
                )}
                {l.monthly_income != null && (
                  <Baris label="Penghasilan (dilaporkan sendiri)">
                    <span className="numeric">{formatIDR(l.monthly_income)} / bulan</span>
                  </Baris>
                )}
                {l.monthly_commitments != null && (
                  <Baris label="Cicilan lain (dilaporkan sendiri)">
                    <span className="numeric">{formatIDR(l.monthly_commitments)} / bulan</span>
                  </Baris>
                )}
                {l.affordability_band != null && (
                  <Baris label="Porsi terhadap penghasilan">
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          WARNA_KEMAMPUAN[l.affordability_band as BandKemampuan] ??
                          "var(--foreground)",
                      }}
                    >
                      {LABEL_KEMAMPUAN[l.affordability_band as BandKemampuan] ??
                        l.affordability_band}
                    </span>
                  </Baris>
                )}
              </dl>

              {l.monthly_income != null && (
                <p className="mt-3 rounded-xl border border-warn/25 bg-warn-50 p-3 text-xs leading-relaxed text-foreground">
                  Penghasilan dan cicilan di atas diketik sendiri oleh calon pembeli tanpa
                  dokumen pendukung, dan kategorinya dihitung dari angka itu. Ini{" "}
                  <strong>bukan</strong> analisa kredit dan tidak boleh dipakai sebagai
                  dasar keputusan kelayakan — gunakan hanya sebagai konteks percakapan.
                </p>
              )}
            </section>
          )}

          {/* ── Riwayat tahap ────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
              Riwayat tahap
            </h2>
            {riwayat.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Belum ada perpindahan tahap.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {riwayat.map((h) => {
                  const penulis = (h as unknown as { profiles: { full_name: string } | null })
                    .profiles
                  return (
                    <li key={h.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {h.dari ? LABEL_STATUS[h.dari] : "Masuk"}
                      </span>
                      <span className="text-muted-foreground" aria-label="menjadi">
                        →
                      </span>
                      <span className="font-semibold text-foreground">
                        {LABEL_STATUS[h.ke]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        oleh {penulis?.full_name || "sistem"}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDateTimeID(h.created_at)}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          {/* ── Catatan ──────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
              Catatan
            </h2>
            {catatan.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Belum ada catatan.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {catatan.map((c) => {
                  const penulis = (c as unknown as { profiles: { full_name: string } | null })
                    .profiles
                  return (
                    <li key={c.id} className="rounded-xl bg-secondary p-3">
                      <p className="text-sm text-foreground">{c.body}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {penulis?.full_name || "—"} · {formatDateTimeID(c.created_at)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <LeadWorkspace
            id={l.id}
            status={l.status}
            ditugaskanKe={l.assigned_to}
            staf={staf}
          />

          <section className="rounded-2xl border border-border bg-accent p-4">
            <h2 className="text-sm font-bold text-foreground">Jejak persetujuan</h2>
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-3">
                <dt>Versi persetujuan</dt>
                <dd className="font-semibold text-foreground">{l.consent_version}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Disetujui pada</dt>
                <dd className="font-semibold text-foreground">
                  {formatDateTimeID(l.consent_at)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Dihapus otomatis</dt>
                <dd className="font-semibold text-foreground">{formatDateID(l.purge_after)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Data pribadi menurut UU No. 27 Tahun 2022. Gunakan hanya untuk keperluan
              yang disetujui pemiliknya.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
