import { bandSkor, LABEL_BAND, WARNA_BAND, type BandSkor } from "@/lib/verification"

/**
 * Cincin skor keandalan informasi.
 *
 * SVG statis, tanpa pustaka animasi: angkanya sudah final saat render, dan
 * memutar cincin dari nol setiap kali kartu masuk layar hanya menambah gerak
 * pada halaman yang sudah penuh gerak. `.lift` dan Reveal mengurus itu.
 *
 * Aksesibilitas: cincinnya aria-hidden dan seluruh maknanya diulang sebagai
 * teks di dalam komponen — jadi pembaca layar mendengar "78 dari 100, Baik",
 * bukan "grafik".
 */
export function ConfidenceMeter({
  skor,
  ukuran = 96,
  label,
  band: bandProp,
}: {
  skor: number
  ukuran?: number
  /** Teks di bawah angka. Default memakai label Indonesia. */
  label?: string
  band?: BandSkor
}) {
  const band = bandProp ?? bandSkor(skor)
  const tebal = ukuran <= 56 ? 5 : 8
  const r = (ukuran - tebal) / 2
  const keliling = 2 * Math.PI * r
  const terisi = (Math.max(0, Math.min(100, skor)) / 100) * keliling

  return (
    <div className="flex flex-col items-center" style={{ width: ukuran }}>
      <div className="relative" style={{ width: ukuran, height: ukuran }}>
        <svg width={ukuran} height={ukuran} viewBox={`0 0 ${ukuran} ${ukuran}`} aria-hidden>
          {/* Alur — hairline netral, bukan abu-abu pekat yang bersaing. */}
          <circle
            cx={ukuran / 2}
            cy={ukuran / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={tebal}
          />
          <circle
            cx={ukuran / 2}
            cy={ukuran / 2}
            r={r}
            fill="none"
            stroke={WARNA_BAND[band]}
            strokeWidth={tebal}
            strokeLinecap="round"
            strokeDasharray={`${terisi} ${keliling - terisi}`}
            // Mulai dari jam 12, bukan jam 3.
            transform={`rotate(-90 ${ukuran / 2} ${ukuran / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display numeric font-extrabold leading-none tracking-[-0.03em]"
            style={{ fontSize: ukuran * 0.3, color: WARNA_BAND[band] }}
          >
            {skor}
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[11px] font-semibold text-foreground">
        {label ?? LABEL_BAND[band]}
      </p>
    </div>
  )
}
