"use client"

import { useTransition } from "react"
import { MessageCircle } from "lucide-react"

import { catatKontakWhatsApp } from "@/app/actions/lead"

/**
 * Tombol hubungi lewat WhatsApp.
 *
 * Peristiwanya dicatat lebih dulu, tetapi TIDAK menghalangi tautannya: kalau
 * pencatatan gagal atau lambat, pengguna tetap sampai ke WhatsApp. Kehilangan
 * satu baris analitik jauh lebih murah daripada kehilangan percakapan.
 */

/**
 * Nomor Indonesia ke format wa.me (E.164 tanpa tanda plus).
 *   0812-3456-7890 -> 6281234567890
 *   +62 812 ...    -> 6281234567890
 */
export function nomorWa(phone: string): string | null {
  const angka = phone.replace(/[^\d]/g, "")
  if (!angka) return null
  if (angka.startsWith("62")) return angka
  if (angka.startsWith("0")) return `62${angka.slice(1)}`
  if (angka.startsWith("8")) return `62${angka}`
  return angka
}

export default function WhatsAppCta({
  housingId,
  housingName,
  phone,
  className,
}: {
  housingId: string
  housingName: string
  phone: string
  className?: string
}) {
  const [, start] = useTransition()
  const nomor = nomorWa(phone)
  if (!nomor) return null

  const pesan = encodeURIComponent(
    `Halo, saya tertarik dengan ${housingName} dan ingin menanyakan informasi KPR BRI.`,
  )

  return (
    <a
      href={`https://wa.me/${nomor}?text=${pesan}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        start(async () => {
          try {
            await catatKontakWhatsApp(housingId)
          } catch {
            // Analitik tidak pernah menghalangi pengguna mencapai WhatsApp.
          }
        })
      }}
      className={
        className ??
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-6 text-sm font-semibold text-foreground transition-colors hover:border-ok/40 hover:bg-ok-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      }
    >
      <MessageCircle className="h-4 w-4 text-ok" aria-hidden />
      Hubungi via WhatsApp
    </a>
  )
}
