import { redirect } from "next/navigation"
import { ShieldCheck, ShieldAlert, Ban, Activity } from "lucide-react"

import { getSesiStaf } from "@/lib/auth"
import {
  getMetrikKeamanan,
  getPeristiwaKeamanan,
  getIdentitasDiblokir,
  getLonjakanKeamanan,
} from "@/lib/queries/admin"
import { formatDateTimeID } from "@/lib/format"
import {
  TombolBlokir,
  TombolBukaBlokir,
  TombolSelesai,
} from "@/components/admin/security-actions"
import type { Database } from "@/lib/database.types"

export const dynamic = "force-dynamic"

type Jenis = Database["public"]["Enums"]["abuse_kind"]

const LABEL: Record<Jenis, { teks: string; jelas: string; kelas: string }> = {
  rate_limit: {
    teks: "Kuota terlampaui",
    jelas: "Permintaan melebihi batas untuk aksi tersebut",
    kelas: "bg-warn-50 text-warn",
  },
  honeypot: {
    teks: "Honeypot terisi",
    jelas: "Mengisi kolom yang tak terlihat manusia — hampir pasti bot",
    kelas: "bg-danger-50 text-danger",
  },
  too_fast: {
    teks: "Terlalu cepat",
    jelas: "Formulir dikirim lebih cepat daripada bisa dibaca",
    kelas: "bg-warn-50 text-warn",
  },
  stale_form: {
    teks: "Formulir basi",
    jelas: "Dikirim jauh setelah halamannya dimuat",
    kelas: "bg-secondary text-muted-foreground",
  },
  challenge_failed: {
    teks: "Verifikasi gagal",
    jelas: "Tidak lolos tantangan keamanan",
    kelas: "bg-danger-50 text-danger",
  },
  challenge_passed: {
    teks: "Verifikasi lolos",
    jelas: "Berhasil membuktikan diri sebagai manusia",
    kelas: "bg-ok-50 text-ok",
  },
  blocked: {
    teks: "Ditolak (diblokir)",
    jelas: "Permintaan dari identitas yang sedang diblokir",
    kelas: "bg-danger-50 text-danger",
  },
  invalid_payload: {
    teks: "Kiriman janggal",
    jelas: "Bentuk kirimannya tidak masuk akal",
    kelas: "bg-warn-50 text-warn",
  },
  auth_fail: {
    teks: "Gagal masuk",
    jelas: "Percobaan masuk berulang yang gagal",
    kelas: "bg-danger-50 text-danger",
  },
  scrape_suspect: {
    teks: "Dugaan penyalinan",
    jelas: "Pola penelusuran massal",
    kelas: "bg-warn-50 text-warn",
  },
  duplicate_lead: {
    teks: "Prospek digabung",
    jelas: "Pengiriman ulang untuk perumahan yang sama — digabung, bukan ditolak",
    kelas: "bg-secondary text-muted-foreground",
  },
}

/** Nama aksi dalam bahasa yang dimengerti admin, bukan nama kunci internal. */
const AKSI: Record<string, string> = {
  lead_submit: "Pengiriman prospek",
  kalkulator: "Simulasi KPR",
  kontak: "Kontak / WhatsApp",
  login: "Masuk dashboard",
  api_read: "Pembacaan data publik",
}

export default async function HalamanKeamanan() {
  // Peristiwa penyalahgunaan hanya terbaca admin (abuse_events_read_admin).
  // RLS akan mengembalikan larik kosong untuk pengembang; mengalihkannya
  // lebih jujur daripada memperlihatkan halaman yang selalu kosong.
  const sesi = await getSesiStaf()
  if (sesi?.role !== "admin") redirect("/admin")

  // getIdentitasDiblokir sudah hanya mengembalikan yang masih berlaku.
  const [metrik, peristiwa, aktif, lonjakan] = await Promise.all([
    getMetrikKeamanan(),
    getPeristiwaKeamanan(100),
    getIdentitasDiblokir(),
    getLonjakanKeamanan(20),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Keamanan
        </h1>
        <p className="mt-1 text-muted-foreground">
          Aktivitas mencurigakan yang tertahan sebelum sampai ke basis data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          {
            label: "Peristiwa 24 jam",
            nilai: metrik.peristiwa24j,
            catatan: `${metrik.identitasUnik} identitas berbeda`,
            warna: metrik.peristiwa24j > 0 ? "text-warn" : "text-ok",
          },
          {
            label: "Bot tertahan",
            nilai: metrik.botTertahan,
            catatan: "honeypot, terlalu cepat, verifikasi gagal",
            warna: "text-foreground",
          },
          {
            label: "Kuota terlampaui",
            nilai: metrik.kuotaTerlampaui,
            catatan: "permintaan melebihi batas",
            warna: "text-foreground",
          },
          {
            label: "Sedang diblokir",
            nilai: metrik.diblokirAktif,
            catatan: "ditolak otomatis di gerbang",
            warna: metrik.diblokirAktif > 0 ? "text-danger" : "text-ok",
          },
          {
            label: "Belum ditangani",
            nilai: metrik.belumSelesai + metrik.lonjakanTerbuka,
            catatan: "temuan berbobot yang menunggu ditinjau",
            warna:
              metrik.belumSelesai + metrik.lonjakanTerbuka > 0 ? "text-warn" : "text-ok",
          },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-5 shadow-e2">
            <p className="text-coord text-muted-foreground">{k.label}</p>
            <p
              className={`font-display numeric mt-2 text-3xl font-extrabold tracking-[-0.02em] ${k.warna}`}
            >
              {k.nilai}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{k.catatan}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-accent p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-foreground">
          Identitas ditampilkan sebagai hash, bukan alamat IP. IP mentah tidak pernah
          disimpan. Satu hash dapat mewakili banyak orang di balik NAT operator seluler,
          jadi blokir manual sebaiknya hanya untuk pola yang jelas otomatis.
        </p>
      </div>

      {/* ── Lonjakan lalu lintas ────────────────────────────────────── */}
      {/*
        Ditaruh paling atas karena inilah satu-satunya sinyal yang TIDAK bisa
        ditangani lapisan per identitas: setiap pengunjungnya wajar bila
        dilihat sendiri-sendiri. Kalau ada yang perlu dibaca admin lebih dulu,
        ini yang pertama.
      */}
      {lonjakan.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
            Lonjakan lalu lintas
          </h2>
          <ul className="mt-4 space-y-3">
            {lonjakan.map((l) => (
              <li
                key={l.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-e2 ${
                  l.resolved_at ? "border-border opacity-70" : "border-warn/40"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Activity
                      className={`h-4 w-4 shrink-0 ${l.resolved_at ? "text-muted-foreground" : "text-warn"}`}
                      aria-hidden
                    />
                    <span className="font-semibold text-foreground">
                      {AKSI[l.action] ?? l.action}
                    </span>
                    {l.resolved_at && (
                      <span className="rounded-full bg-ok-50 px-2 py-0.5 text-[11px] font-semibold text-ok">
                        selesai
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="numeric font-semibold text-foreground">{l.requests}</span>{" "}
                    permintaan dari{" "}
                    <span className="numeric font-semibold text-foreground">{l.identities}</span>{" "}
                    identitas berbeda dalam satu jam
                    {l.suspicious > 0 && (
                      <>
                        {" · "}
                        <span className="numeric font-semibold text-warn">{l.suspicious}</span>{" "}
                        di antaranya sudah tertahan
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTimeID(l.created_at)} · kuota per identitas tetap berlaku
                  </p>
                </div>
                <TombolSelesai id={l.id} selesai={Boolean(l.resolved_at)} jenis="lonjakan" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Sedang diblokir ─────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
          Sedang diblokir ({aktif.length})
        </h2>
        {aktif.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-e2">
            Tidak ada identitas yang sedang diblokir.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {aktif.map((b) => (
              <li
                key={b.ip_hash}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-white p-4 shadow-e2"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Ban className="h-4 w-4 shrink-0 text-danger" aria-hidden />
                    <code className="numeric break-all text-xs text-foreground">
                      {b.ip_hash.slice(0, 16)}…
                    </code>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {b.is_manual ? "manual" : "otomatis"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{b.reason}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sampai {formatDateTimeID(b.blocked_until)} · {b.hits}× pelanggaran
                  </p>
                </div>
                <TombolBukaBlokir ipHash={b.ip_hash} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Peristiwa ───────────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
          Peristiwa terakhir
        </h2>
        {peristiwa.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-ok/25 bg-ok-50 p-8 text-center shadow-e2">
            <ShieldAlert className="mx-auto h-9 w-9 text-ok" aria-hidden />
            <p className="mt-3 font-semibold text-foreground">Tidak ada aktivitas mencurigakan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lalu lintas yang masuk sejauh ini terlihat normal.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white shadow-e2">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Waktu
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Jenis
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Aksi
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Identitas
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {peristiwa.map((p) => {
                  const l = LABEL[p.kind]
                  return (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTimeID(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${l.kelas}`}
                        >
                          {l.teks}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {l.jelas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">
                        {p.action ?? "—"}
                        {p.path && (
                          <span className="block text-[11px] text-muted-foreground">{p.path}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="numeric text-xs text-muted-foreground">
                          {p.ip_hash.slice(0, 12)}…
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {/*
                          Hanya temuan berbobot yang punya status. Verifikasi
                          yang lolos dan prospek yang digabung dicatat sebagai
                          keterangan, bukan sebagai pekerjaan — memberi keduanya
                          tombol "selesai" akan membuat antrean yang seharusnya
                          pendek terlihat penuh.
                        */}
                        {p.severity > 0 ? (
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              p.resolved_at ? "bg-ok-50 text-ok" : "bg-warn-50 text-warn"
                            }`}
                          >
                            {p.resolved_at ? "Selesai" : "Terbuka"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {p.severity > 0 && (
                            <TombolSelesai id={p.id} selesai={Boolean(p.resolved_at)} />
                          )}
                          {p.kind !== "challenge_passed" && p.kind !== "duplicate_lead" && (
                            <TombolBlokir ipHash={p.ip_hash} />
                          )}
                        </div>
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
