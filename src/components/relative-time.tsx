import { formatDateTimeID, formatRelative } from "@/lib/format"
import type { Locale } from "@/lib/i18n"

/**
 * "2 hari yang lalu", dengan tanggal persisnya tersimpan di title dan dateTime.
 *
 * suppressHydrationWarning ada karena nilainya diturunkan dari Date.now(): SSR
 * dan klien bisa menghasilkan satuan berbeda kalau render kebetulan melewati
 * pergantian jam atau hari. Selisihnya tidak pernah lebih dari satu satuan dan
 * klien selalu yang menang, jadi peringatan React di sini murni derau.
 *
 * Tanggal absolutnya tetap ada di atribut title — pembaca yang butuh angka
 * pasti tidak perlu menghitung mundur sendiri.
 */
export function WaktuRelatif({
  iso,
  locale = "id",
  className,
}: {
  iso: string | null | undefined
  locale?: Locale
  className?: string
}) {
  if (!iso) return <span className={className}>—</span>

  return (
    <time
      dateTime={iso}
      title={formatDateTimeID(iso)}
      className={className}
      suppressHydrationWarning
    >
      {formatRelative(iso, locale)}
    </time>
  )
}
