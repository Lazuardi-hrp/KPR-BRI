import {
  AMBANG_KEMAMPUAN,
  KETERANGAN_KEMAMPUAN,
  LABEL_KEMAMPUAN,
  WARNA_KEMAMPUAN,
  type BandKemampuan,
} from "@/lib/kpr"

/**
 * Meteran rasio angsuran terhadap penghasilan.
 *
 * Batang, bukan cincin seperti ConfidenceMeter. Yang digambarkan di sini
 * adalah posisi pada sebuah skala dengan ambang bernama — "28%, di bawah
 * batas 30%" — dan sebuah cincin menyembunyikan justru bagian itu: di mana
 * batasnya dan seberapa dekat orangnya. Garis ambang dapat digambar pada
 * batang; pada cincin ia menjadi teka-teki.
 *
 * Ambangnya dibaca dari AMBANG_KEMAMPUAN, bukan ditulis ulang sebagai angka
 * di JSX. Gambar yang mengeja sendiri batasnya akan berbohong pada perubahan
 * kebijakan pertama, dan berbohong dengan meyakinkan.
 *
 * Aksesibilitas mengikuti ConfidenceMeter: grafiknya aria-hidden dan seluruh
 * maknanya diulang sebagai teks, jadi pembaca layar mendengar "angsuran 28%
 * dari penghasilan bulanan — Aman", bukan "grafik".
 */

/** Skala meteran. Di atas ini rasio dipotong; 60% sudah jauh melewati batas. */
const SKALA_MAKS = 0.6

export function AffordabilityMeter({
  dsr,
  band,
  keterangan = true,
}: {
  /** (angsuran + komitmen) / penghasilan. */
  dsr: number
  band: BandKemampuan
  /** Sertakan kalimat penjelas di bawah meteran. */
  keterangan?: boolean
}) {
  const rasio = Number.isFinite(dsr) ? Math.max(0, dsr) : SKALA_MAKS
  const persen = Math.round(rasio * 100)
  const isi = Math.min(rasio / SKALA_MAKS, 1) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">Porsi dari penghasilan bulanan</p>
        <p
          className="font-display numeric text-lg font-extrabold leading-none tracking-[-0.02em]"
          style={{ color: WARNA_KEMAMPUAN[band] }}
        >
          {persen}%
        </p>
      </div>

      <div aria-hidden className="mt-2">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${isi}%`, backgroundColor: WARNA_KEMAMPUAN[band] }}
          />
          {/* Garis ambang. Yang terakhir (Infinity) tidak digambar — ia bukan
              batas melainkan sisa skala. */}
          {AMBANG_KEMAMPUAN.filter((a) => Number.isFinite(a.maks)).map((a) => (
            <span
              key={a.band}
              className="absolute top-0 h-full w-px bg-white/70"
              style={{ left: `${(a.maks / SKALA_MAKS) * 100}%` }}
            />
          ))}
        </div>

        <div className="mt-1.5 flex justify-between">
          {AMBANG_KEMAMPUAN.filter((a) => Number.isFinite(a.maks)).map((a) => (
            <span key={a.band} className="numeric text-[10px] text-muted-foreground">
              {Math.round(a.maks * 100)}%
            </span>
          ))}
          <span className="numeric text-[10px] text-muted-foreground">
            {Math.round(SKALA_MAKS * 100)}%
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm font-bold" style={{ color: WARNA_KEMAMPUAN[band] }}>
        {LABEL_KEMAMPUAN[band]}
      </p>

      {/* Satu-satunya salinan yang dibaca pembaca layar. Meteran di atas
          aria-hidden, jadi kalimat ini menanggung seluruh maknanya. */}
      <p className="sr-only">
        Angsuran dan cicilan lain berjumlah {persen} persen dari penghasilan bulanan Anda.
        Kategori: {LABEL_KEMAMPUAN[band]}. {KETERANGAN_KEMAMPUAN[band]}
      </p>

      {keterangan && (
        <p aria-hidden className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {KETERANGAN_KEMAMPUAN[band]}
        </p>
      )}
    </div>
  )
}

export default AffordabilityMeter
