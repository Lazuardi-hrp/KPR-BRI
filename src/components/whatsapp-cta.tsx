"use client"

import { useTransition } from "react"
import { MessageCircle } from "lucide-react"

import { catatKontakWhatsApp } from "@/app/actions/lead"
import { idSesiPublik } from "@/components/jejak"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  tautanWa,
  type KonteksWhatsApp,
  type NiatWhatsApp,
} from "@/lib/whatsapp"

/**
 * Tombol melanjutkan percakapan di WhatsApp.
 *
 * Peristiwanya dicatat lebih dulu, tetapi TIDAK menghalangi tautannya: kalau
 * pencatatan gagal atau lambat, pengguna tetap sampai ke WhatsApp. Kehilangan
 * satu baris analitik jauh lebih murah daripada kehilangan percakapan.
 *
 * Tetap sebuah <a> dengan href sungguhan, bukan tombol yang memanggil
 * window.open. Ini yang membuatnya bisa dibuka di tab baru, disalin, dan —
 * yang paling menentukan di ponsel — tidak pernah tertahan pemblokir popup,
 * karena navigasinya berasal langsung dari ketukan pengguna dan bukan dari
 * kode yang berjalan setelah sebuah await.
 */

export type VarianWa = "utama" | "garis" | "halus"

type Props = {
  /** Nomor tujuan. Bila kosong/tidak sah, komponen tidak merender apa pun. */
  phone: string | null | undefined
  niat?: NiatWhatsApp
  konteks?: KonteksWhatsApp
  /**
   * Perumahan yang diatribusikan pada peristiwanya. null untuk pertanyaan yang
   * memang belum menyangkut perumahan mana pun (/simulasi tanpa pilihan) —
   * record_event menerima null, dan mengarang id di sana hanya akan menaruh
   * minat pada perumahan yang tidak pernah dibuka siapa pun.
   */
  housingId?: string | null
  label?: string
  varian?: VarianWa
  ukuran?: "default" | "sm" | "lg"
  className?: string
}

const LABEL_BAWAAN: Record<NiatWhatsApp, string> = {
  properti: "Tanya lewat WhatsApp",
  kemampuan: "Diskusikan di WhatsApp",
  bantuan: "Tanya petugas di WhatsApp",
  lanjutan: "Lanjutkan di WhatsApp",
}

export default function WhatsAppCta({
  phone,
  niat = "properti",
  konteks,
  housingId,
  label,
  varian = "garis",
  ukuran = "default",
  className,
}: Props) {
  const [, start] = useTransition()
  const href = tautanWa(phone, niat, konteks)
  if (!href) return null

  const gaya =
    varian === "halus"
      ? cn(
          "inline-flex items-center gap-2 text-sm font-semibold text-ok transition-colors hover:text-ok/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full",
          className,
        )
      : cn(
          buttonVariants({ variant: varian === "utama" ? "default" : "outline", size: ukuran }),
          varian === "utama"
            ? "bg-ok text-white shadow-sm shadow-ok/20 hover:bg-ok/90"
            : "text-foreground hover:border-ok/40 hover:bg-ok-50",
          className,
        )

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        start(async () => {
          try {
            await catatKontakWhatsApp(housingId ?? null, idSesiPublik(), niat)
          } catch {
            // Analitik tidak pernah menghalangi pengguna mencapai WhatsApp.
          }
        })
      }}
      className={gaya}
    >
      <MessageCircle
        className={cn("h-4 w-4 shrink-0", varian === "utama" ? "text-white" : "text-ok")}
        aria-hidden
      />
      {label ?? LABEL_BAWAAN[niat]}
    </a>
  )
}
