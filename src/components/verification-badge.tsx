import { BadgeCheck, Clock, RefreshCw } from "lucide-react"

import { formatDateTimeID } from "@/lib/format"
import {
  LABEL_BIDANG,
  LABEL_STATUS,
  type BidangVerifikasi,
  type StatusVerifikasi,
} from "@/lib/verification"

/**
 * Lencana verifikasi untuk layar ADMIN.
 *
 * Sisi publik memakai <TrustPanel>, yang dwibahasa dan bisa dibuka-tutup.
 * Yang ini tetap komponen server berbahasa Indonesia karena /admin memang
 * berbahasa Indonesia saja, dan petugas butuh tanggal-jam persis, bukan
 * "2 hari yang lalu".
 *
 * Varian `ringkas` yang dulu ada di sini sudah pindah ke <VerificationChip>,
 * yang tahu cara tampil di atas permukaan ink.
 */

const IKON: Record<StatusVerifikasi, typeof BadgeCheck> = {
  terverifikasi: BadgeCheck,
  menunggu: Clock,
  perlu_pembaruan: RefreshCw,
}

/** Latar + garis dan tinta dipisah, bukan dipotong ulang dari satu string. */
const PERMUKAAN: Record<StatusVerifikasi, string> = {
  terverifikasi: "border-ok/30 bg-ok-50",
  menunggu: "border-border bg-secondary",
  perlu_pembaruan: "border-warn/30 bg-warn-50",
}

const TINTA: Record<StatusVerifikasi, string> = {
  terverifikasi: "text-ok",
  menunggu: "text-muted-foreground",
  perlu_pembaruan: "text-warn",
}

const PENJELASAN: Record<StatusVerifikasi, string> = {
  terverifikasi: "Seluruh bidang diperiksa petugas dan masih dalam masa berlaku.",
  menunggu: "Belum pernah diperiksa. Data ini tetap tampil ke pengunjung apa adanya.",
  perlu_pembaruan:
    "Sebagian bidang belum diperiksa, atau datanya berubah setelah pemeriksaan terakhir.",
}

export default function VerificationBadge({
  status,
  verifiedAt,
  lastDataChangeAt,
  fields,
}: {
  status: StatusVerifikasi | null | undefined
  verifiedAt?: string | null
  lastDataChangeAt?: string | null
  fields?: string[] | null
}) {
  const s = status ?? "menunggu"
  const Ikon = IKON[s]
  const diperiksa = (fields ?? []).map(
    (f) => LABEL_BIDANG[f as BidangVerifikasi] ?? f,
  )

  return (
    <section
      aria-label="Status verifikasi properti"
      className={`rounded-2xl border p-4 ${PERMUKAAN[s]}`}
    >
      <p className={`flex items-center gap-2 text-sm font-bold ${TINTA[s]}`}>
        <Ikon className="h-4 w-4 shrink-0" aria-hidden />
        {LABEL_STATUS[s]}
      </p>

      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{PENJELASAN[s]}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {verifiedAt && (
          <>
            <dt className="text-muted-foreground">Diperiksa terakhir</dt>
            <dd className="text-right font-semibold text-foreground">
              {formatDateTimeID(verifiedAt)}
            </dd>
          </>
        )}
        {lastDataChangeAt && (
          <>
            <dt className="text-muted-foreground">Data terakhir berubah</dt>
            <dd className="text-right font-semibold text-foreground">
              {formatDateTimeID(lastDataChangeAt)}
            </dd>
          </>
        )}
      </dl>

      {diperiksa.length > 0 && (
        <div className="mt-3 border-t border-current/10 pt-3">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Dicentang pada pemeriksaan terakhir
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {diperiksa.map((f) => (
              <li
                key={f}
                className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
