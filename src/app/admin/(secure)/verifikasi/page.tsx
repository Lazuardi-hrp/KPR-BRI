import Link from "next/link"
import { AlarmClock, ArrowUpRight, BadgeCheck, Clock, RefreshCw } from "lucide-react"

import { getAntreanVerifikasi, getMetrikVerifikasi } from "@/lib/queries/admin"
import type { AntreanVerifikasi } from "@/lib/queries/admin"
import { formatDateID, formatDateTimeID } from "@/lib/format"
import {
  LABEL_TAHAP,
  LENCANA_STATUS,
  LENCANA_TAHAP,
  sinyalDariAntrean,
  skorKepercayaan,
  tahapVerifikasi,
  URUTAN_TAHAP,
  type StatusVerifikasi,
  type TahapVerifikasi,
} from "@/lib/verification"

export const dynamic = "force-dynamic"

const IKON_STATUS: Record<StatusVerifikasi, typeof BadgeCheck> = {
  terverifikasi: BadgeCheck,
  menunggu: Clock,
  perlu_pembaruan: RefreshCw,
}

const LABEL_STATUS_PENDEK: Record<StatusVerifikasi, string> = {
  terverifikasi: "Terverifikasi",
  menunggu: "Menunggu",
  perlu_pembaruan: "Perlu pembaruan",
}

/** Kenapa baris ini ada di posisinya — dijelaskan, bukan cuma diurutkan. */
const ALASAN: Record<number, string> = {
  0: "Terbit tetapi belum pernah diverifikasi — pengunjung sedang melihat data yang belum diperiksa.",
  1: "Terbit dan datanya berubah sejak verifikasi terakhir.",
  2: "Verifikasi akan segera kedaluwarsa.",
  3: "Belum pernah diverifikasi.",
  4: "Terverifikasi dan masih berlaku.",
}

const cip =
  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

type Params = Promise<{ tahap?: string }>

function tautan(tahap?: string) {
  return tahap ? `/admin/verifikasi?tahap=${tahap}` : "/admin/verifikasi"
}

export default async function AntreanVerifikasiPage({
  searchParams,
}: {
  searchParams: Params
}) {
  const sp = await searchParams
  const saring = URUTAN_TAHAP.includes(sp.tahap as TahapVerifikasi)
    ? (sp.tahap as TahapVerifikasi)
    : null

  const [antrean, metrik] = await Promise.all([
    getAntreanVerifikasi(200),
    getMetrikVerifikasi(),
  ])

  // Tahap diturunkan sekali di sini lalu ikut ke bawah, supaya kartu ringkasan,
  // tab, dan tabel tidak pernah menghitungnya sendiri-sendiri.
  const baris = antrean.map((h) => ({
    h,
    tahap: tahapVerifikasi(h.verification_status as StatusVerifikasi, h.verification_due_at),
    skor: skorKepercayaan(sinyalDariAntrean(h)).skor,
  }))

  const mendesak = baris.filter((b) => b.h.prioritas <= 2)
  const terlihat = saring ? baris.filter((b) => b.tahap === saring) : baris

  const jumlahTahap = URUTAN_TAHAP.reduce<Record<string, number>>((acc, t) => {
    acc[t] = baris.filter((b) => b.tahap === t).length
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Pusat verifikasi properti
        </h1>
        <p className="mt-1 text-muted-foreground">
          Urutannya ditentukan seberapa mendesak, bukan abjad. Yang di atas adalah data
          yang sedang dilihat pengunjung tetapi belum dipastikan benar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kartu
          label="Terverifikasi"
          nilai={metrik.terverifikasi}
          warna="text-ok"
          catatan={
            metrik.terbitBelumVerif > 0
              ? `${metrik.terbitBelumVerif} terbit tanpa verifikasi`
              : "Semua yang terbit sudah diperiksa"
          }
        />
        <Kartu label="Menunggu verifikasi" nilai={metrik.menunggu} warna="text-foreground" />
        <Kartu label="Perlu pembaruan" nilai={metrik.perluPembaruan} warna="text-warn" />
        <Kartu
          label="Jatuh tempo"
          nilai={metrik.jatuhTempo}
          warna={metrik.jatuhTempo > 0 ? "text-danger" : "text-ok"}
          catatan="Berlaku < 7 hari lagi"
        />
      </div>

      {/* Siklus perawatan, bukan verifikasi sekali jalan. Angkanya datang dari
          verification_metrics(), ambang yang sama dengan HARI_SEGERA_DITINJAU. */}
      {metrik.jatuhTempo > 0 && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-warn/30 bg-warn-50 p-4 text-sm text-foreground">
          <AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
          <span>
            <strong className="font-semibold">
              {metrik.jatuhTempo} properti harus ditinjau ulang minggu ini.
            </strong>{" "}
            Lewat tanggal tinjau ulang, statusnya turun otomatis menjadi &ldquo;perlu
            pembaruan&rdquo; dan centang hijaunya hilang dari halaman publik.
          </span>
        </p>
      )}

      {mendesak.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
            Perlu perhatian ({mendesak.length})
          </h2>
          <ul className="mt-4 space-y-3">
            {mendesak.map(({ h, skor }) => (
              <Baris key={h.id} h={h} skor={skor} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
            Semua properti ({terlihat.length})
          </h2>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={tautan()}
            className={`${cip} ${
              saring === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({baris.length})
          </Link>
          {URUTAN_TAHAP.map((t) => (
            <Link
              key={t}
              href={tautan(t)}
              className={`${cip} ${
                saring === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {LABEL_TAHAP[t]} ({jumlahTahap[t] ?? 0})
            </Link>
          ))}
        </div>

        {terlihat.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-white p-12 text-center shadow-e2">
            <BadgeCheck className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              Tidak ada properti pada tahap ini.
            </p>
            <Link
              href={tautan()}
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Tampilkan semua
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white shadow-e2">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Properti</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Lokasi</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Verifikasi</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">
                    Terakhir dicek
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Skor
                  </th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Tahap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {terlihat.map(({ h, tahap, skor }) => {
                  const st = (h.verification_status as StatusVerifikasi) ?? "menunggu"
                  const Ikon = IKON_STATUS[st]
                  return (
                    <tr key={h.id} className="transition-colors hover:bg-secondary/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/verifikasi/${h.id}`}
                          className="font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {h.name}
                        </Link>
                        {h.status !== "published" && (
                          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {h.status === "draft" ? "Draft" : "Arsip"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {h.district ?? "—"}
                        {h.village ? `, ${h.village}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${LENCANA_STATUS[st]}`}
                        >
                          <Ikon className="h-3 w-3" aria-hidden />
                          {LABEL_STATUS_PENDEK[st]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {h.verified_at ? formatDateID(h.verified_at) : "belum pernah"}
                      </td>
                      <td className="numeric px-4 py-3 text-right font-semibold text-foreground">
                        {skor}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${LENCANA_TAHAP[tahap]}`}
                        >
                          {LABEL_TAHAP[tahap]}
                          {h.hari_terlambat > 0 && ` · lewat ${h.hari_terlambat} hari`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Kartu({
  label,
  nilai,
  warna,
  catatan,
}: {
  label: string
  nilai: number
  warna: string
  catatan?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-e2">
      <p className="text-coord text-muted-foreground">{label}</p>
      <p
        className={`font-display numeric mt-2 text-3xl font-extrabold tracking-[-0.02em] ${warna}`}
      >
        {nilai}
      </p>
      {catatan && <p className="mt-1 text-sm text-muted-foreground">{catatan}</p>}
    </div>
  )
}

function Baris({ h, skor }: { h: AntreanVerifikasi; skor: number }) {
  const st = (h.verification_status as StatusVerifikasi) ?? "menunggu"
  const Ikon = IKON_STATUS[st]

  return (
    <li>
      <Link
        href={`/admin/verifikasi/${h.id}`}
        className={`group block rounded-2xl border bg-white p-5 shadow-e2 transition-shadow hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          h.prioritas === 0 ? "border-danger/40" : "border-border"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{h.name}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${LENCANA_STATUS[st]}`}
              >
                <Ikon className="h-3 w-3" aria-hidden />
                {LABEL_STATUS_PENDEK[st]}
              </span>
              {h.status === "published" ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Terbit
                </span>
              ) : (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {h.status === "draft" ? "Draft" : "Arsip"}
                </span>
              )}
              <span className="numeric rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground">
                Skor {skor}
              </span>
            </div>

            <p className="mt-1.5 text-sm text-muted-foreground">{ALASAN[h.prioritas]}</p>

            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <div className="flex gap-1.5">
                <dt>Diverifikasi</dt>
                <dd className="font-semibold text-foreground">
                  {h.verified_at ? formatDateID(h.verified_at) : "belum pernah"}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Data diubah</dt>
                <dd className="font-semibold text-foreground">
                  {formatDateTimeID(h.last_data_change_at)}
                </dd>
              </div>
              {h.verification_due_at && (
                <div className="flex gap-1.5">
                  <dt>Tinjau ulang</dt>
                  <dd
                    className={`font-semibold ${
                      h.hari_terlambat > 0 ? "text-danger" : "text-foreground"
                    }`}
                  >
                    {formatDateID(h.verification_due_at)}
                    {h.hari_terlambat > 0 && ` · lewat ${h.hari_terlambat} hari`}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5">
            Periksa <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  )
}
