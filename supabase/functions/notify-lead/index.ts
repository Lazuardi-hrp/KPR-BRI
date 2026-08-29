/**
 * Edge Function: notify-lead
 *
 * Dipicu Database Webhook pada INSERT ke public.notification_outbox, dan oleh
 * sapuan ulang pg_cron (public.sweep_notification_outbox) untuk percobaan ulang.
 *
 * Pola outbox (PRD A-9): kegagalan mengirim email TIDAK PERNAH menggagalkan
 * transaksi prospek. Prospeknya sudah tersimpan sebelum fungsi ini menyala;
 * yang bisa gagal di sini hanyalah pemberitahuannya, dan kegagalan itu
 * dicatat lalu dicoba ulang dengan backoff, bukan dibuang diam-diam.
 *
 * Deploy:
 *   supabase functions deploy notify-lead --project-ref <ref>
 * Rahasia:
 *   supabase secrets set RESEND_API_KEY=... ADMIN_NOTIFICATION_EMAIL=...
 */
import { createClient } from "jsr:@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const DARI = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "KPR BRI <onboarding@resend.dev>"
const SITE = Deno.env.get("SITE_URL") ?? ""

/** Backoff eksponensial sesuai PRD §12: 5 menit * 2^percobaan, mati di 6. */
function jadwalUlang(attempts: number) {
  return new Date(Date.now() + 5 * 60_000 * Math.pow(2, attempts)).toISOString()
}

async function alamatAdmin(): Promise<string | null> {
  const dariEnv = Deno.env.get("ADMIN_NOTIFICATION_EMAIL")
  if (dariEnv) return dariEnv
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "admin_email")
    .maybeSingle()
  const v = data?.value
  return typeof v === "string" && v.length > 3 ? v : null
}

Deno.serve(async (req) => {
  let outboxId: string | null = null

  try {
    const body = await req.json()
    // Database Webhook mengirim { type, record, ... }; pg_cron mengirim { outbox_id }.
    outboxId = body.outbox_id ?? body.record?.id ?? null
    if (!outboxId) return new Response("outbox_id tidak ada", { status: 400 })

    const { data: item } = await supabase
      .from("notification_outbox")
      .select("id, template, payload, attempts, status")
      .eq("id", outboxId)
      .maybeSingle()

    if (!item) return new Response("antrean tidak ditemukan", { status: 404 })
    if (item.status === "sent") return new Response("sudah terkirim", { status: 200 })

    const leadId = (item.payload as { lead_id?: string })?.lead_id
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, phone, email, message, created_at, housings(name)")
      .eq("id", leadId ?? "")
      .maybeSingle()

    if (!lead) throw new Error("prospek tidak ditemukan")

    const tujuan = await alamatAdmin()
    if (!tujuan) throw new Error("alamat email admin belum dikonfigurasi (app_settings.admin_email)")
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY belum diatur")

    const perumahan =
      (lead as unknown as { housings: { name: string } | null }).housings?.name ?? "—"

    const html = `
      <h2>Prospek baru</h2>
      <p><strong>${lead.name}</strong> menyatakan minat pada <strong>${perumahan}</strong>.</p>
      <ul>
        <li>Telepon: ${lead.phone}</li>
        <li>Email: ${lead.email ?? "—"}</li>
        <li>Waktu: ${new Date(lead.created_at).toLocaleString("id-ID")}</li>
      </ul>
      ${lead.message ? `<p>Pesan:<br>${lead.message}</p>` : ""}
      ${SITE ? `<p><a href="${SITE}/admin/prospek">Buka kotak masuk prospek</a></p>` : ""}
      <hr>
      <p style="color:#666;font-size:12px">
        Berisi data pribadi. Gunakan hanya untuk menindaklanjuti minat KPR yang disetujui
        pemiliknya (UU No. 27 Tahun 2022).
      </p>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: DARI,
        to: [tujuan],
        subject: `Prospek baru: ${lead.name} — ${perumahan}`,
        html,
      }),
    })

    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`)

    await supabase
      .from("notification_outbox")
      .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
      .eq("id", outboxId)

    return new Response("terkirim", { status: 200 })
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e)

    if (outboxId) {
      const { data: item } = await supabase
        .from("notification_outbox")
        .select("attempts")
        .eq("id", outboxId)
        .maybeSingle()

      const attempts = (item?.attempts ?? 0) + 1
      await supabase
        .from("notification_outbox")
        .update({
          status: attempts >= 6 ? "dead" : "failed",
          attempts,
          last_error: pesan.slice(0, 500),
          next_try_at: jadwalUlang(attempts),
        })
        .eq("id", outboxId)
    }

    // 200 disengaja: antreannya sudah menyimpan kegagalan dan jadwal ulangnya.
    // Membalas 5xx hanya membuat webhook Supabase mencoba lagi di luar kendali
    // backoff kita, sehingga percobaan terhitung ganda.
    return new Response(`gagal dicatat: ${pesan}`, { status: 200 })
  }
})
