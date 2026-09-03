import "server-only"

/**
 * Verifikasi token Cloudflare Turnstile.
 *
 * Turnstile bersifat OPSIONAL. Bila TURNSTILE_SECRET_KEY belum diisi, seluruh
 * lapisan tantangan tetap berjalan — hanya saja tantangannya tidak bisa
 * dipenuhi, sehingga permintaan berisiko ditolak, bukan diloloskan diam-diam.
 * Membuka pintu ketika penjaga tidak dipasang adalah kegagalan yang paling
 * mahal dan paling mudah tidak disadari; di sini kegagalannya menutup.
 *
 * Situs kecil boleh menjalankan tanpa kunci Turnstile: pengguna normal tidak
 * pernah sampai ke tahap tantangan (skor < 30 dan di bawah kuota), jadi yang
 * terkena hanyalah lalu lintas yang memang sudah mencurigakan.
 */

export function turnstileAktif(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  )
}

export type HasilTurnstile = { lolos: boolean; alasan?: string }

export async function verifikasiTurnstile(
  token: string | null | undefined,
  ip?: string | null,
): Promise<HasilTurnstile> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { lolos: false, alasan: "turnstile_belum_dikonfigurasi" }
  if (!token) return { lolos: false, alasan: "token_kosong" }

  const body = new URLSearchParams({ secret, response: token })
  // remoteip opsional bagi Turnstile dan menaikkan ketelitiannya bila ada.
  if (ip) body.set("remoteip", ip)

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      // Verifikasi tidak boleh menggantung permintaan pengguna. Bila Cloudflare
      // lambat, lebih baik gagal cepat lalu minta ulang daripada membuat
      // pengiriman formulir tampak macet.
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })

    if (!res.ok) return { lolos: false, alasan: `http_${res.status}` }

    const data = (await res.json()) as {
      success?: boolean
      "error-codes"?: string[]
    }

    return data.success
      ? { lolos: true }
      : { lolos: false, alasan: data["error-codes"]?.join(",") ?? "ditolak" }
  } catch (e) {
    return {
      lolos: false,
      alasan: e instanceof Error && e.name === "TimeoutError" ? "waktu_habis" : "galat_jaringan",
    }
  }
}
