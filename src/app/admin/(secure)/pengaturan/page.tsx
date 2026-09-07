import { getSesiStaf } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function Pengaturan() {
  const sesi = await getSesiStaf()
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value, description, updated_at")
    .order("key")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Pengaturan
        </h1>
        <p className="mt-1 text-muted-foreground">Konfigurasi runtime aplikasi</p>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
        <h2 className="font-semibold text-foreground">Akun Anda</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">{sesi?.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Peran</dt>
            <dd className="font-medium capitalize text-foreground">{sesi?.role}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Nama</dt>
            <dd className="font-medium text-foreground">{sesi?.fullName || "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
          Kata sandi dan MFA (TOTP) dikelola di Dashboard Supabase. Untuk produk keuangan,
          MFA wajib diaktifkan pada setiap akun admin.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
        <h2 className="font-semibold text-foreground">Konfigurasi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kunci berawalan <code className="rounded bg-secondary px-1">public.</code> dapat dibaca
          pengunjung; sisanya hanya staf.
        </p>
        <ul className="mt-4 divide-y divide-border">
          {(settings ?? []).map((s) => (
            <li key={s.key} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <code className="text-sm font-semibold text-foreground">{s.key}</code>
                <code className="numeric text-sm text-primary">{JSON.stringify(s.value)}</code>
              </div>
              {s.description && (
                <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
