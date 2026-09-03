import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  History,
  PencilLine,
  Plus,
  RefreshCw,
} from "lucide-react"

import { getDetailVerifikasi } from "@/lib/queries/admin"
import { formatDateID, formatDateTimeID, formatIDR } from "@/lib/format"
import {
  LABEL_BIDANG,
  LABEL_RIWAYAT,
  LABEL_TAHAP,
  LENCANA_TAHAP,
  skorKepercayaan,
  tahapVerifikasi,
  URUTAN_BIDANG,
  type BidangVerifikasi,
  type SinyalKepercayaan,
  type StatusVerifikasi,
} from "@/lib/verification"
import VerificationForm, { type BidangPeriksa } from "@/components/admin/verification-form"
import VerificationBadge from "@/components/verification-badge"
import { ConfidenceMeter } from "@/components/confidence-meter"

export const dynamic = "force-dynamic"

/** Nilai bidang uang ditampilkan sebagai Rupiah, sisanya apa adanya. */
function tampilkanNilai(field: string, v: string | null): string {
  if (v == null || v === "") return "—"
  if (field === "price_min" || field === "price_max") {
    const n = Number(v)
    return Number.isFinite(n) ? formatIDR(n) : v
  }
  return v
}

/** Satu entri lini masa, apa pun asal tabelnya. */
type Entri = {
  kunci: string
  waktu: string
  jenis: "verifikasi" | "perubahan" | "dibuat"
  judul: string
  rincian?: string
  lama?: string
  baru?: string
}

export default async function LayarVerifikasi({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getDetailVerifikasi(id)
  if (!data) notFound()

  const { housing: h, kontak, gambar, bidang, riwayat, lampau } = data
  const pengembang = (h as unknown as { developers: { name: string } | null }).developers
  const kontakUtama = kontak[0]

  const cek = new Map(bidang.map((b) => [b.field, b]))
  const nilai: Record<BidangVerifikasi, string> = {
    nama: h.name,
    harga:
      h.price_min == null
        ? "Belum diisi"
        : h.price_max == null || h.price_max === h.price_min
          ? formatIDR(h.price_min)
          : `${formatIDR(h.price_min)} – ${formatIDR(h.price_max)}`,
    lokasi: h.address || `${h.lat}, ${h.lng}`,
    pengembang: pengembang?.name ?? "Belum ditautkan",
    foto: gambar.length > 0 ? `${gambar.length} foto terpasang` : "Belum ada foto",
    kontak: kontakUtama?.phone ?? kontakUtama?.name ?? "Belum ada kontak",
    ketersediaan_unit: `${h.available_units ?? 0} dari ${
      (h.subsidi_units ?? 0) + (h.commercial_units ?? 0)
    } unit tersedia`,
  }

  const daftarPeriksa: BidangPeriksa[] = URUTAN_BIDANG.map((k) => ({
    key: k,
    label: LABEL_BIDANG[k],
    nilai: nilai[k],
    berubah: cek.get(k)?.changed_since ?? false,
    terakhirDicek: cek.get(k)?.last_checked_at ?? null,
  }))

  // Skor dihitung dari sinyal yang sama dengan halaman publik, jadi angka yang
  // dilihat petugas persis angka yang dilihat pengunjung.
  const sinyal: SinyalKepercayaan = {
    status: h.verification_status,
    verifiedAt: h.verified_at,
    verificationDueAt: h.verification_due_at,
    lastDataChangeAt: h.last_data_change_at,
    verifiedFields: (lampau[0]?.checked as unknown as string[] | undefined) ?? null,
    needsReview: h.needs_review ?? false,
    ada: {
      nama: Boolean(h.name?.trim()),
      harga: h.price_min != null,
      lokasi: Boolean(h.address?.trim()),
      pengembang: Boolean(h.developer_id),
      foto: gambar.length > 0,
      kontak: Boolean(kontakUtama?.phone?.trim()),
      ketersediaan_unit: (h.subsidi_units ?? 0) + (h.commercial_units ?? 0) > 0,
    },
  }
  const { skor, band } = skorKepercayaan(sinyal)
  const tahap = tahapVerifikasi(
    h.verification_status as StatusVerifikasi,
    h.verification_due_at,
  )

  // Riwayat harga tetap dipisah di atas: itu pertanyaan yang paling sering
  // datang, dan membacanya di antara perubahan koordinat membuatnya tenggelam.
  const riwayatHarga = riwayat.filter((r) => r.field === "price_min" || r.field === "price_max")

  // Satu lini masa, bukan tiga daftar terpisah. Peristiwa verifikasi dan
  // perubahan data saling menjelaskan — memisahkannya memaksa pembaca
  // mencocokkan tanggal sendiri antara dua kotak.
  const lini: Entri[] = [
    ...lampau.map((v): Entri => {
      const dicentang = (v.checked as unknown as string[]) ?? []
      return {
        kunci: `v-${v.id}`,
        waktu: v.created_at,
        jenis: "verifikasi",
        judul:
          dicentang.length === 0
            ? `Ditandai perlu pembaruan oleh ${v.verified_email ?? "petugas"}`
            : `Diperiksa oleh ${v.verified_email ?? "petugas"}`,
        rincian:
          dicentang.length === 0
            ? (v.note ?? undefined)
            : [
                dicentang
                  .map((c) => LABEL_BIDANG[c as BidangVerifikasi] ?? c)
                  .join(", "),
                v.note,
              ]
                .filter(Boolean)
                .join(" · "),
      }
    }),
    ...riwayat.map(
      (r): Entri => ({
        kunci: `r-${r.id}`,
        waktu: r.created_at,
        jenis: "perubahan",
        judul: `${LABEL_RIWAYAT[r.field] ?? r.field} diperbarui`,
        lama: tampilkanNilai(r.field, r.nilai_lama),
        baru: tampilkanNilai(r.field, r.nilai_baru),
      }),
    ),
    {
      kunci: "dibuat",
      waktu: h.created_at,
      jenis: "dibuat" as const,
      judul: "Properti dibuat",
    },
  ].sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())

  return (
    <div className="space-y-6">
      <Link
        href="/admin/verifikasi"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke antrean
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
            {h.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${LENCANA_TAHAP[tahap]}`}
            >
              {LABEL_TAHAP[tahap]}
            </span>
            <span className="text-sm text-muted-foreground">
              Data terakhir berubah {formatDateTimeID(h.last_data_change_at)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {h.status === "published" && (
            <Link
              href={`/perumahan/${h.slug}`}
              target="_blank"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-4 w-4" aria-hidden /> Lihat halaman publik
            </Link>
          )}
          <Link
            href={`/admin/perumahan/${h.id}`}
            className="inline-flex h-11 items-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ubah data
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-e2 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <p className="text-coord text-muted-foreground">Keandalan informasi</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Angka yang sama tampil di halaman publik. Ia menilai kelengkapan dan
                kebaruan data — bukan mutu propertinya.
              </p>
            </div>
            <ConfidenceMeter skor={skor} band={band} ukuran={88} />
          </div>

          <VerificationBadge
            status={h.verification_status}
            verifiedAt={h.verified_at}
            lastDataChangeAt={h.last_data_change_at}
            fields={lampau[0]?.checked as unknown as string[] | undefined}
          />

          {h.verification_due_at && h.verification_status === "terverifikasi" && (
            <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
              Verifikasi berlaku sampai{" "}
              <span className="font-semibold text-foreground">
                {formatDateID(h.verification_due_at)}
              </span>
              . Setelah itu statusnya turun otomatis menjadi &ldquo;perlu pembaruan&rdquo;.
            </p>
          )}

          {h.verification_note && (
            <div className="rounded-2xl border border-border bg-white p-4 shadow-e2">
              <p className="text-xs font-semibold text-muted-foreground">
                Catatan verifikasi terakhir
              </p>
              <p className="mt-1.5 text-sm text-foreground">{h.verification_note}</p>
            </div>
          )}

          {/* ── Riwayat harga ────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden /> Riwayat harga
            </h2>
            {riwayatHarga.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada perubahan harga sejak pencatatan dimulai.
              </p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {riwayatHarga.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="text-xs text-muted-foreground">
                      {formatDateID(r.created_at)}
                    </span>
                    <span className="numeric text-muted-foreground line-through">
                      {tampilkanNilai(r.field, r.nilai_lama)}
                    </span>
                    <span aria-hidden>→</span>
                    <span className="numeric font-semibold text-foreground">
                      {tampilkanNilai(r.field, r.nilai_baru)}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {LABEL_RIWAYAT[r.field] ?? r.field}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ── Lini masa verifikasi ─────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
              Riwayat verifikasi
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pemeriksaan dan perubahan data dalam satu urutan waktu.
            </p>
            <ol className="mt-4 space-y-0">
              {lini.map((e, i) => (
                <li key={e.kunci} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* Garis penghubung, berhenti di entri terakhir. */}
                  {i < lini.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[11px] top-6 h-full w-px bg-border"
                    />
                  )}
                  <span
                    className={`relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                      e.jenis === "verifikasi"
                        ? "bg-ok-50 text-ok"
                        : e.jenis === "perubahan"
                          ? "bg-warn-50 text-warn"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {e.jenis === "verifikasi" ? (
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    ) : e.jenis === "perubahan" ? (
                      <PencilLine className="h-3 w-3" aria-hidden />
                    ) : (
                      <Plus className="h-3 w-3" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-semibold text-foreground">{e.judul}</p>
                      <time
                        dateTime={e.waktu}
                        className="text-[11px] text-muted-foreground"
                      >
                        {formatDateTimeID(e.waktu)}
                      </time>
                    </div>
                    {e.rincian && (
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        {e.rincian}
                      </p>
                    )}
                    {e.lama !== undefined && (
                      <p className="numeric mt-0.5 break-words text-xs text-muted-foreground">
                        <span className="line-through">{e.lama}</span> →{" "}
                        <span className="font-semibold text-foreground">{e.baru}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {lampau.length === 0 && (
              <p className="mt-2 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Properti ini belum pernah diverifikasi.
              </p>
            )}
          </section>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <VerificationForm housingId={h.id} bidang={daftarPeriksa} />
        </div>
      </div>
    </div>
  )
}
