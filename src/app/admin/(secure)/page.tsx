import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  Inbox,
  ShieldAlert,
  UserPlus,
} from "lucide-react"

import {
  getRingkasanAdmin,
  getMetrikProspek,
  getMetrikVerifikasi,
  getMetrikKeamanan,
  getDaftarProspek,
  getAntreanVerifikasi,
} from "@/lib/queries/admin"
import { getSesiStaf } from "@/lib/auth"
import { formatDateTimeID, formatIDR } from "@/lib/format"
import { LABEL_STATUS, LENCANA_STATUS, terlambat } from "@/lib/lead-status"

export const dynamic = "force-dynamic"

/**
 * Dashboard operasional.
 *
 * Disusun untuk menjawab tiga pertanyaan, dalam urutan itu:
 *   1. Siapa yang harus dihubungi?
 *   2. Data properti mana yang perlu perhatian?
 *   3. Ada yang mencurigakan?
 *
 * Angka-angka lama (jumlah perumahan, unit tersedia) turun ke bawah. Semuanya
 * benar, tetapi tidak satu pun menuntut tindakan hari ini — dan bagian atas
 * layar adalah tempat termahal untuk informasi yang tidak menuntut apa-apa.
 */

function Kartu({
  label,
  nilai,
  catatan,
  nada = "netral",
  href,
}: {
  label: string
  nilai: string | number
  catatan?: string
  nada?: "netral" | "ok" | "warn" | "danger"
  href?: string
}) {
  const warna = {
    netral: "text-foreground",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
  }[nada]

  const isi = (
    <>
      <p className="text-coord text-muted-foreground">{label}</p>
      <p
        className={`font-display numeric mt-2 text-3xl font-extrabold tracking-[-0.02em] ${warna}`}
      >
        {nilai}
      </p>
      {catatan && <p className="mt-1 text-sm text-muted-foreground">{catatan}</p>}
    </>
  )

  const kelas = "block rounded-2xl border border-border bg-white p-5 shadow-e2"

  return href ? (
    <Link
      href={href}
      className={`${kelas} transition-shadow hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  )
}

function JudulBagian({
  nomor,
  pertanyaan,
  href,
  tautanLabel,
}: {
  nomor: string
  pertanyaan: string
  href: string
  tautanLabel: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
        <span className="text-coord mr-2 text-muted-foreground">{nomor}</span>
        {pertanyaan}
      </h2>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5"
      >
        {tautanLabel} <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}

export default async function AdminDashboard() {
  const sesi = await getSesiStaf()
  const adalahAdmin = sesi?.role === "admin"

  const [r, prospek, verif, keamanan, daftarProspek, antrean] = await Promise.all([
    getRingkasanAdmin(),
    getMetrikProspek(),
    getMetrikVerifikasi(),
    adalahAdmin
      ? getMetrikKeamanan()
      : Promise.resolve({
          peristiwa24j: 0,
          diblokirAktif: 0,
          kuotaTerlampaui: 0,
          botTertahan: 0,
          identitasUnik: 0,
        }),
    getDaftarProspek({ status: "baru" }),
    getAntreanVerifikasi(6),
  ])

  const perluPerhatian = antrean.filter((a) => a.prioritas <= 2)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Ringkasan
        </h1>
        <p className="mt-1 text-muted-foreground">
          Tiga hal yang menentukan hari ini: prospek yang menunggu, data yang perlu
          ditinjau, dan keamanan platform.
        </p>
      </div>

      {/* ─── 1. Siapa yang harus dihubungi? ─────────────────────────── */}
      <section className="space-y-4">
        <JudulBagian
          nomor="01"
          pertanyaan="Siapa yang harus dihubungi?"
          href="/admin/prospek"
          tautanLabel="Buka kotak masuk"
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kartu
            label="Prospek baru"
            nilai={prospek.baru}
            catatan={`${prospek.mingguIni} masuk 7 hari terakhir`}
            nada={prospek.baru > 0 ? "ok" : "netral"}
            href="/admin/prospek?status=baru"
          />
          <Kartu
            label="Perlu tindak lanjut"
            nilai={prospek.perluTindak}
            catatan="sudah dihubungi, belum tuntas"
            nada={prospek.perluTindak > 0 ? "warn" : "netral"}
            href="/admin/prospek?status=tindak_lanjut"
          />
          <Kartu
            label="Terkualifikasi"
            nilai={prospek.terkualifikasi}
            catatan="layak lanjut ke pengajuan"
            href="/admin/prospek?status=terkualifikasi"
          />
          <Kartu
            label="Pengajuan"
            nilai={prospek.pengajuan}
            catatan="berkas KPR berjalan"
            href="/admin/prospek?status=pengajuan"
          />
        </div>

        {prospek.terlambat > 0 && (
          <div className="rounded-2xl border border-danger/30 bg-danger-50 p-5">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">
                  {prospek.terlambat} prospek melewati batas waktu kontak pertama
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orang-orang ini menyerahkan nomor teleponnya dan belum dihubungi
                  siapa pun. Semakin lama jaraknya, semakin kecil kemungkinan mereka
                  masih menunggu.
                </p>
                <Link
                  href="/admin/prospek?terlambat=1"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:gap-2.5"
                >
                  Lihat yang terlambat <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        )}

        {prospek.belumDitugaskan > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-e2">
            <UserPlus className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="flex-1 text-sm text-foreground">
              <span className="numeric font-bold">{prospek.belumDitugaskan}</span> prospek
              aktif belum ditugaskan ke petugas mana pun.
            </p>
            <Link
              href="/admin/prospek?belum_ditugaskan=1"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Tugaskan
            </Link>
          </div>
        )}

        {daftarProspek.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-e2">
            <ul className="divide-y divide-border">
              {daftarProspek.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/admin/prospek/${l.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-4 transition-colors hover:bg-secondary"
                  >
                    {terlambat(l.status, l.first_contact_due_at) && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-danger"
                        aria-label="Melewati batas waktu"
                      />
                    )}
                    <span className="font-semibold text-foreground">{l.name}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LENCANA_STATUS[l.status]}`}
                    >
                      {LABEL_STATUS[l.status]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {l.housing?.name ?? "—"}
                    </span>
                    {l.est_monthly_payment != null && (
                      <span className="numeric text-sm font-semibold text-primary">
                        {formatIDR(l.est_monthly_payment)}/bln
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTimeID(l.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ─── 2. Data properti mana yang perlu perhatian? ─────────────── */}
      <section className="space-y-4">
        <JudulBagian
          nomor="02"
          pertanyaan="Data properti mana yang perlu perhatian?"
          href="/admin/verifikasi"
          tautanLabel="Buka verifikasi"
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kartu
            label="Terverifikasi"
            nilai={verif.terverifikasi}
            catatan={`dari ${r.totalPerumahan} perumahan`}
            nada={verif.terverifikasi > 0 ? "ok" : "netral"}
          />
          <Kartu
            label="Menunggu verifikasi"
            nilai={verif.menunggu}
            catatan="belum pernah diperiksa"
          />
          <Kartu
            label="Perlu pembaruan"
            nilai={verif.perluPembaruan}
            catatan="data berubah sejak diperiksa"
            nada={verif.perluPembaruan > 0 ? "warn" : "netral"}
          />
          <Kartu
            label="Terbit tanpa verifikasi"
            nilai={verif.terbitBelumVerif}
            catatan="sedang dilihat pengunjung"
            nada={verif.terbitBelumVerif > 0 ? "danger" : "ok"}
          />
        </div>

        {perluPerhatian.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-e2">
            <ul className="divide-y divide-border">
              {perluPerhatian.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/admin/verifikasi/${h.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-4 transition-colors hover:bg-secondary"
                  >
                    <BadgeCheck
                      className={`h-4 w-4 shrink-0 ${
                        h.prioritas === 0 ? "text-danger" : "text-warn"
                      }`}
                      aria-hidden
                    />
                    <span className="font-semibold text-foreground">{h.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {h.verification_status === "menunggu"
                        ? "Belum pernah diverifikasi"
                        : "Perlu pembaruan"}
                    </span>
                    {h.status === "published" && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary">
                        Terbit
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      Data diubah {formatDateTimeID(h.last_data_change_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.stokMenipis.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-warn" aria-hidden /> Stok menipis
            </h3>
            <ul className="mt-3 divide-y divide-border">
              {r.stokMenipis.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-foreground">{h.name}</span>
                  <span className="numeric text-sm font-bold text-warn">
                    {h.available_units} unit
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ─── 3. Ada yang mencurigakan? ──────────────────────────────── */}
      {adalahAdmin && (
        <section className="space-y-4">
          <JudulBagian
            nomor="03"
            pertanyaan="Ada yang mencurigakan?"
            href="/admin/keamanan"
            tautanLabel="Buka keamanan"
          />

          {keamanan.peristiwa24j === 0 && keamanan.diblokirAktif === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-ok/25 bg-ok-50 p-5">
              <ShieldAlert className="h-5 w-5 shrink-0 text-ok" aria-hidden />
              <p className="text-sm text-foreground">
                Tidak ada aktivitas mencurigakan dalam 24 jam terakhir.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kartu
                label="Peristiwa 24 jam"
                nilai={keamanan.peristiwa24j}
                catatan={`${keamanan.identitasUnik} identitas berbeda`}
                nada={keamanan.peristiwa24j > 0 ? "warn" : "netral"}
                href="/admin/keamanan"
              />
              <Kartu
                label="Bot tertahan"
                nilai={keamanan.botTertahan}
                catatan="honeypot, terlalu cepat, tantangan gagal"
                href="/admin/keamanan"
              />
              <Kartu
                label="Kuota terlampaui"
                nilai={keamanan.kuotaTerlampaui}
                catatan="permintaan melebihi batas"
                href="/admin/keamanan"
              />
              <Kartu
                label="Sedang diblokir"
                nilai={keamanan.diblokirAktif}
                catatan="identitas ditolak otomatis"
                nada={keamanan.diblokirAktif > 0 ? "danger" : "netral"}
                href="/admin/keamanan"
              />
            </div>
          )}
        </section>
      )}

      {/* ─── Konteks ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
          <span className="text-coord mr-2 text-muted-foreground">04</span>
          Katalog
        </h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kartu
            label="Perumahan terbit"
            nilai={r.terbit}
            catatan={`dari ${r.totalPerumahan} total`}
            href="/admin/perumahan"
          />
          <Kartu label="Draft" nilai={r.draft} catatan="belum terlihat publik" />
          <Kartu
            label="Unit tersedia"
            nilai={r.totalUnitTersedia.toLocaleString("id-ID")}
          />
          <Kartu
            label="Total prospek"
            nilai={prospek.total}
            catatan="sepanjang masa retensi"
            href="/admin/prospek"
          />
        </div>

        <Link
          href="/admin/prospek"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-e2 transition-shadow hover:shadow-e3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Inbox className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-foreground">Kotak masuk prospek</span>
            <span className="block text-sm text-muted-foreground">
              {prospek.baru} belum ditindaklanjuti
            </span>
          </span>
          <ArrowUpRight
            className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </section>
    </div>
  )
}
