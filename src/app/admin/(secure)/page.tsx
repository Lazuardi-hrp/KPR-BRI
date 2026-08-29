import Link from "next/link"
import { AlertTriangle, ArrowUpRight, Inbox, Home, TriangleAlert } from "lucide-react"

import { getRingkasanAdmin, getJejakAudit } from "@/lib/queries/admin"
import { formatDateTimeID } from "@/lib/format"

export const dynamic = "force-dynamic"

function Kartu({
  label,
  nilai,
  catatan,
  nada = "netral",
}: {
  label: string
  nilai: string | number
  catatan?: string
  nada?: "netral" | "ok" | "warn" | "danger"
}) {
  const warna = {
    netral: "text-foreground",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
  }[nada]

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-e2">
      <p className="text-coord text-muted-foreground">{label}</p>
      <p className={`font-display numeric mt-2 text-3xl font-extrabold tracking-[-0.02em] ${warna}`}>
        {nilai}
      </p>
      {catatan && <p className="mt-1 text-sm text-muted-foreground">{catatan}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const r = await getRingkasanAdmin()
  const audit = await getJejakAudit(8)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Ringkasan
        </h1>
        <p className="mt-1 text-muted-foreground">
          Data yang dilihat pengunjung berasal langsung dari sini.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kartu label="Perumahan terbit" nilai={r.terbit} catatan={`dari ${r.totalPerumahan} total`} />
        <Kartu label="Draft" nilai={r.draft} catatan="belum terlihat publik" />
        <Kartu label="Unit tersedia" nilai={r.totalUnitTersedia.toLocaleString("id-ID")} />
        <Kartu
          label="Prospek baru"
          nilai={r.prospekBaru}
          catatan={`${r.prospekTotal} total masuk`}
          nada={r.prospekBaru > 0 ? "ok" : "netral"}
        />
      </div>

      {r.perluTinjau > 0 && (
        <div className="rounded-2xl border border-warn/30 bg-warn-50 p-5">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            <div>
              <p className="font-semibold text-foreground">
                {r.perluTinjau} perumahan masih memakai angka turunan
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Jumlah unit diturunkan otomatis saat migrasi dari data lama, dan kontaknya
                masih placeholder. Angka ini tampil ke calon pembeli. Perbaiki lalu matikan
                penanda &ldquo;perlu ditinjau&rdquo; pada tiap perumahan.
              </p>
              <Link
                href="/admin/perumahan"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5"
              >
                Tinjau daftar perumahan <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {r.stokMenipis.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-e2">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-warn" /> Stok menipis
          </h2>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/admin/perumahan"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-e2 transition-shadow hover:shadow-e3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Home className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-foreground">Kelola perumahan</span>
            <span className="block text-sm text-muted-foreground">Tambah, ubah, terbitkan</span>
          </span>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/admin/prospek"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-e2 transition-shadow hover:shadow-e3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Inbox className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-foreground">Kotak masuk prospek</span>
            <span className="block text-sm text-muted-foreground">
              {r.prospekBaru} belum ditindaklanjuti
            </span>
          </span>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-e2">
        <h2 className="font-semibold text-foreground">Perubahan terakhir</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Setiap perubahan pada perumahan, pengembang, dan prospek terekam otomatis.
        </p>
        {audit.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Belum ada perubahan tercatat.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2.5 text-sm">
                <span className="font-mono text-xs font-semibold uppercase text-primary">
                  {a.action}
                </span>
                <span className="text-foreground">{a.table_name}</span>
                <span className="text-muted-foreground">
                  oleh {a.actor_email ?? "sistem"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTimeID(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
