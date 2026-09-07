import type { RingkasanCorong } from "@/lib/queries/analytics"

/**
 * Definisi tahap corong dan peta label — bukan komponen.
 *
 * Mengikuti kebiasaan lead-status.ts dan verification.ts: peta label dan warna
 * tinggal di src/lib, tidak pernah di dalam halaman. Halaman yang menyimpan
 * petanya sendiri akan menyimpang dari halaman berikutnya yang butuh peta yang
 * sama, dan penyimpangan itu baru ketahuan ketika dua layar menyebut hal yang
 * sama dengan dua nama berbeda.
 */

/** Rentang waktu yang boleh diminta dari URL. */
export const RENTANG = [7, 30, 90] as const
export type Rentang = (typeof RENTANG)[number]
export const RENTANG_BAWAAN: Rentang = 30

/** Membaca ?rentang= dengan aman; apa pun yang aneh jatuh ke bawaan. */
export function bacaRentang(nilai: string | string[] | undefined): Rentang {
  const n = Number(Array.isArray(nilai) ? nilai[0] : nilai)
  return (RENTANG as readonly number[]).includes(n) ? (n as Rentang) : RENTANG_BAWAAN
}

export type TahapCorong = {
  kunci: keyof RingkasanCorong & string
  label: string
  /** Apa yang sebenarnya dihitung. Tampil sebagai keterangan, bukan tooltip. */
  arti: string
  warna: string
}

/**
 * Lima tahap, bukan enam.
 *
 * Corong ini berhenti di "prospek masuk" karena di situlah perjalanan di SITUS
 * berakhir. Tahap 'pengajuan' digerakkan petugas dari /admin/prospek, bukan
 * oleh pengunjung; menempelkannya sebagai batang keenam akan mencampur dua
 * hal yang bergerak karena sebab berbeda, dan penurunan di batang terakhir
 * akan terbaca sebagai masalah situs padahal ia masalah tindak lanjut.
 * Angkanya tetap ditampilkan — sebagai keterangan di bawah corong, bukan
 * sebagai tahap.
 *
 * Warna memakai tangga ordinal satu rona, bukan lima warna berbeda: tahapnya
 * BERURUTAN, dan warna kategoris akan menyiratkan lima hal yang setara.
 */
export const TAHAP_CORONG: TahapCorong[] = [
  {
    kunci: "kunjungan",
    label: "Pengunjung",
    arti: "sesi peramban yang meninggalkan jejak apa pun",
    warna: "var(--viz-1)",
  },
  {
    kunci: "lihatProperti",
    label: "Membuka properti",
    arti: "membuka setidaknya satu halaman detail",
    warna: "var(--viz-2)",
  },
  {
    kunci: "pakaiKalkulator",
    label: "Memakai kalkulator",
    arti: "mengubah setidaknya satu masukan simulasi",
    warna: "var(--viz-3)",
  },
  {
    kunci: "kontak",
    label: "Menghubungi WhatsApp",
    arti: "menekan tombol hubungi",
    warna: "var(--viz-4)",
  },
  {
    kunci: "prospek",
    label: "Mengirim prospek",
    arti: "formulir minat terkirim dan tersimpan",
    warna: "var(--viz-5)",
  },
]

/** Nama hari untuk peta kalor. Indeks mengikuti extract(dow): 0 = Minggu. */
export const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const

/**
 * Label band kemampuan bayar pada dasbor.
 *
 * null bukan kekeliruan data melainkan keterangan tersendiri: prospek yang
 * dikirim tanpa pernah menyentuh kalkulator. Menyembunyikannya akan
 * menghilangkan satu-satunya petunjuk seberapa sering formulir diisi tanpa
 * simulasi sama sekali.
 */
export const LABEL_BAND: Record<string, string> = {
  aman: "Aman",
  wajar: "Wajar",
  ketat: "Ketat",
  melebihi: "Melebihi",
}
export const LABEL_BAND_KOSONG = "Tanpa simulasi"

/**
 * Persentase satu tahap terhadap tahap SEBELUMNYA.
 *
 * Inilah angka yang menjawab "di mana bocornya" — bukan persentase terhadap
 * puncak, yang selalu menurun dan karena itu tidak pernah menunjuk satu tahap
 * pun sebagai yang bermasalah.
 */
export function lajuLanjut(sekarang: number, sebelumnya: number): number | null {
  if (sebelumnya <= 0) return null
  return (sekarang / sebelumnya) * 100
}
