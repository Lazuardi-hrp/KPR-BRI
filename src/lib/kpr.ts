/**
 * Perhitungan angsuran KPR.
 *
 * Berkas ini adalah satu-satunya tempat rumus angsuran hidup. Kalkulator di
 * halaman detail, ringkasan pada prospek, dan email pemberitahuan semuanya
 * memanggil fungsi yang sama — kalau tidak, tiga tempat akan menampilkan tiga
 * angka berbeda untuk perumahan yang sama, dan calon pembeli akan mengingat
 * yang paling murah.
 *
 * SEMUA KELUARAN BERSIFAT ESTIMASI. Angka pasti hanya keluar dari analisa
 * kredit BRI. Setiap tempat yang menampilkan hasilnya wajib menyertakan
 * kalimat itu — lihat DISCLAIMER di bawah.
 */

export type SkemaKPR = "subsidi" | "komersial"

/** Parameter satu skema. Bentuknya dipakai baik oleh SKEMA maupun oleh
 *  konfigurasi yang dibaca dari app_settings — lihat src/lib/queries/kpr.ts. */
export type ParamSkema = {
  label: string
  bunga: number
  tenorMax: number
  tenorDefault: number
  dpMinPersen: number
  dpDefaultPersen: number
  catatan: string
}

export type KonfigSkema = Record<SkemaKPR, ParamSkema>

/**
 * Parameter skema, dipisah dari rumus supaya perubahan kebijakan (bunga FLPP
 * naik, tenor maksimum berubah) tidak menyentuh matematikanya sama sekali.
 *
 * Angka bunga di sini INDIKATIF dan perlu ditinjau bila kebijakan berubah:
 *   - subsidi   : FLPP, tetap 5% sepanjang tenor (PMK subsidi selisih bunga)
 *   - komersial : suku bunga berjenjang; 9,5% dipakai sebagai angka wajar
 *                 untuk estimasi awal, bukan penawaran.
 *
 * Sejak migrasi 0019 nilai yang BERLAKU dibaca dari app_settings
 * (`public.kpr_skema`) supaya tim BRI bisa mengoreksi bunga tanpa deploy.
 * Yang di bawah ini adalah cadangan: dipakai bila baris itu belum ada,
 * tidak terbaca, atau isinya tidak sah. Cadangan yang salah lebih baik
 * daripada halaman yang menampilkan NaN.
 */
export const SKEMA: KonfigSkema = {
  subsidi: {
    label: "KPR Subsidi (FLPP)",
    bunga: 5,
    tenorMax: 20,
    tenorDefault: 15,
    dpMinPersen: 1,
    dpDefaultPersen: 10,
    catatan: "Bunga tetap 5% sepanjang tenor. Berlaku syarat penghasilan maksimum.",
  },
  komersial: {
    label: "KPR Komersial",
    bunga: 9.5,
    tenorMax: 30,
    tenorDefault: 15,
    dpMinPersen: 15,
    dpDefaultPersen: 20,
    catatan: "Bunga indikatif dan dapat berubah mengikuti ketentuan yang berlaku.",
  },
}

export const DISCLAIMER =
  "Angka di atas adalah estimasi, bukan penawaran kredit. Besaran angsuran " +
  "yang mengikat ditentukan setelah analisa kredit oleh BRI."

/**
 * Batas rasio angsuran terhadap penghasilan yang lazim dipakai bank (DSR).
 *
 * Disebut sekali di sini dan diturunkan ke mana-mana. Sebelumnya angka 0,3
 * tertulis langsung di dalam hitungKPR sebagai `angsuran / 0.3`; begitu
 * kalkulator kemampuan bayar ikut memakainya, dua tempat yang mengeja angka
 * yang sama akan menyimpang pada perubahan kebijakan pertama.
 */
export const RASIO_DSR_MAKS = 0.3

export type HasilKPR = {
  hargaProperti: number
  uangMuka: number
  uangMukaPersen: number
  pokokPinjaman: number
  tenorTahun: number
  bungaPersen: number
  angsuranBulanan: number
  totalPembayaran: number
  totalBunga: number
  /** Penghasilan minimum agar angsuran tidak melebihi 30% pendapatan. */
  penghasilanMinimum: number
}

/**
 * Angsuran anuitas: A = P · i / (1 − (1 + i)^−n)
 *
 * Anuitas dipakai — bukan bunga flat — karena itu yang benar-benar dipakai
 * bank untuk KPR. Bunga flat menghasilkan angka yang tampak lebih ramah dan
 * meleset jauh dari tagihan sebenarnya; menampilkannya di situs KPR akan
 * menyesatkan orang tentang kemampuan bayarnya sendiri.
 *
 * Kasus bunga 0% ditangani terpisah: pembaginya menjadi nol pada rumus di atas.
 */
export function hitungAngsuran(
  pokok: number,
  bungaTahunanPersen: number,
  tenorTahun: number,
): number {
  const n = Math.round(tenorTahun * 12)
  if (n <= 0 || pokok <= 0) return 0

  const i = bungaTahunanPersen / 100 / 12
  if (i === 0) return pokok / n

  return (pokok * i) / (1 - Math.pow(1 + i, -n))
}

export function hitungKPR(params: {
  harga: number
  skema: SkemaKPR
  uangMukaPersen: number
  tenorTahun: number
  /** Menimpa bunga skema. Dipakai admin bila menawarkan promo tertentu. */
  bungaPersen?: number
  /** Parameter skema yang berlaku. Default ke cadangan yang dikompilasi. */
  konfig?: KonfigSkema
}): HasilKPR {
  const s = (params.konfig ?? SKEMA)[params.skema]
  const harga = Math.max(0, params.harga)

  // Batas dijepit di sini, bukan hanya di komponen: fungsi ini juga dipanggil
  // dari Server Action, tempat nilainya datang dari kiriman yang bisa dikarang.
  const dpPersen = jepit(params.uangMukaPersen, s.dpMinPersen, 90)
  const tenor = jepit(params.tenorTahun, 1, s.tenorMax)
  const bunga = jepit(params.bungaPersen ?? s.bunga, 0, 30)

  const uangMuka = Math.round((harga * dpPersen) / 100)
  const pokok = Math.max(0, harga - uangMuka)
  const angsuran = hitungAngsuran(pokok, bunga, tenor)
  const total = angsuran * tenor * 12

  return {
    hargaProperti: harga,
    uangMuka,
    uangMukaPersen: dpPersen,
    pokokPinjaman: pokok,
    tenorTahun: tenor,
    bungaPersen: bunga,
    angsuranBulanan: Math.round(angsuran),
    totalPembayaran: Math.round(total),
    totalBunga: Math.round(total - pokok),
    penghasilanMinimum: Math.round(angsuran / RASIO_DSR_MAKS),
  }
}

function jepit(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}

// ── Kemampuan bayar ───────────────────────────────────────────────────────
//
// Bagian ini menjawab pertanyaan yang berlawanan arah dengan hitungKPR.
// hitungKPR bertanya "rumah seharga ini, berapa angsurannya?"; bagian ini
// bertanya "penghasilan saya segini, rumah seharga berapa yang masuk akal?".
// Keduanya WAJIB memakai rumus anuitas yang sama — kalau tidak, harga maksimum
// yang ditawarkan di sini akan menghasilkan angsuran yang berbeda begitu
// pengunjung membuka halaman perumahannya, dan kepercayaan itu tidak kembali.

/**
 * Kebalikan anuitas: P = A · (1 − (1 + i)^−n) / i
 *
 * Kasus bunga 0% ditangani terpisah dengan alasan yang sama seperti pada
 * hitungAngsuran — di sana pembaginya nol, di sini pengalinya.
 */
export function hitungPokokDariAngsuran(
  angsuran: number,
  bungaTahunanPersen: number,
  tenorTahun: number,
): number {
  const n = Math.round(tenorTahun * 12)
  if (n <= 0 || angsuran <= 0) return 0

  const i = bungaTahunanPersen / 100 / 12
  if (i === 0) return angsuran * n

  return (angsuran * (1 - Math.pow(1 + i, -n))) / i
}

/**
 * Band kemampuan bayar.
 *
 * Menggambarkan ANGGARAN PENGUNJUNG, bukan keputusan bank. Penamaannya
 * sengaja tidak memakai kosakata persetujuan kredit ("layak", "disetujui",
 * "memenuhi syarat"): band ini dihitung dari angka yang diketik sendiri oleh
 * pengunjung, tanpa verifikasi apa pun, dan menyamarkannya sebagai penilaian
 * bank adalah persis yang dilarang design.md §7.3.
 */
export type BandKemampuan = "aman" | "wajar" | "ketat" | "melebihi"

export const LABEL_KEMAMPUAN: Record<BandKemampuan, string> = {
  aman: "Aman",
  wajar: "Wajar",
  ketat: "Ketat",
  melebihi: "Melebihi kemampuan",
}

/** Penjelasan satu kalimat, dalam bahasa yang tidak menuntut pengetahuan KPR. */
export const KETERANGAN_KEMAMPUAN: Record<BandKemampuan, string> = {
  aman: "Angsuran ini masih menyisakan ruang yang lega pada penghasilan bulanan Anda.",
  wajar: "Angsuran ini masih wajar, tetapi ruang untuk pengeluaran tak terduga menipis.",
  ketat:
    "Angsuran ini menyita sebagian besar penghasilan Anda. Pertimbangkan tenor lebih panjang atau uang muka lebih besar.",
  melebihi:
    "Angsuran ini melampaui batas yang umumnya dianggap sehat. Coba harga yang lebih rendah, uang muka lebih besar, atau tenor lebih panjang.",
}

/** Warna band. Memakai token semantik, bukan hijau/kuning/merah ad hoc. */
export const WARNA_KEMAMPUAN: Record<BandKemampuan, string> = {
  aman: "var(--ok)",
  wajar: "var(--brand)",
  ketat: "var(--warn)",
  melebihi: "var(--danger)",
}

/**
 * Ambang atas tiap band, sebagai rasio angsuran+komitmen terhadap penghasilan.
 * Dipakai juga oleh meteran untuk menggambar garis batasnya, sehingga angka
 * pada gambar dan angka pada logika tidak mungkin berbeda.
 */
export const AMBANG_KEMAMPUAN: Array<{ band: BandKemampuan; maks: number }> = [
  { band: "aman", maks: 0.3 },
  { band: "wajar", maks: 0.35 },
  { band: "ketat", maks: 0.45 },
  { band: "melebihi", maks: Infinity },
]

export function bandKemampuan(dsr: number): BandKemampuan {
  if (!Number.isFinite(dsr) || dsr < 0) return "melebihi"
  return AMBANG_KEMAMPUAN.find((a) => dsr <= a.maks)!.band
}

export type HasilKemampuan = {
  penghasilan: number
  komitmen: number
  /** Sisa penghasilan yang boleh dipakai mengangsur, setelah komitmen lain. */
  kapasitasAngsuran: number
  /** Harga properti tertinggi yang masih masuk kapasitas itu. */
  hargaMaksimum: number
  /** Angsuran skenario yang sedang dilihat, bila ada. */
  angsuran: number
  /** (angsuran + komitmen) / penghasilan. 0 bila penghasilan belum diisi. */
  dsr: number
  band: BandKemampuan
  tenorTahun: number
  uangMukaPersen: number
  bungaPersen: number
}

/**
 * Kemampuan bayar dari penghasilan dan komitmen bulanan.
 *
 * `angsuran` opsional: bila diisi (pengunjung sedang melihat rumah tertentu),
 * DSR dihitung dari angsuran itu. Bila tidak, DSR dihitung dari kapasitas
 * penuh — yang menurut definisinya persis menyentuh batas RASIO_DSR_MAKS.
 *
 * Fungsi ini dipanggil juga dari Server Action, jadi seluruh masukannya
 * dijepit di sini dan bukan hanya di komponen — alasannya sama dengan
 * hitungKPR: nilainya bisa datang dari kiriman yang dikarang.
 */
export function hitungKemampuan(params: {
  penghasilan: number
  komitmen?: number
  skema: SkemaKPR
  tenorTahun: number
  uangMukaPersen: number
  /** Angsuran yang sedang dilihat. Kosong = pakai kapasitas penuh. */
  angsuran?: number
  bungaPersen?: number
  konfig?: KonfigSkema
}): HasilKemampuan {
  const s = (params.konfig ?? SKEMA)[params.skema]

  // Batas atasnya besar tetapi terhingga: penghasilan Rp 1 triliun jelas salah
  // ketik, dan membiarkannya lolos membuat harga maksimum menjadi angka yang
  // tidak bisa dibaca manusia, bukan galat yang terlihat.
  const penghasilan = jepit(params.penghasilan, 0, 1_000_000_000)
  const komitmen = jepit(params.komitmen ?? 0, 0, 1_000_000_000)
  const dpPersen = jepit(params.uangMukaPersen, s.dpMinPersen, 90)
  const tenor = jepit(params.tenorTahun, 1, s.tenorMax)
  const bunga = jepit(params.bungaPersen ?? s.bunga, 0, 30)

  const kapasitas = Math.max(0, penghasilan * RASIO_DSR_MAKS - komitmen)
  const pokokMaks = hitungPokokDariAngsuran(kapasitas, bunga, tenor)

  // Pokok adalah harga setelah uang muka, jadi harga penuhnya dibagi sisa
  // porsinya. dpPersen sudah dijepit ke maksimum 90, sehingga pembaginya
  // tidak pernah nol.
  const hargaMaks = pokokMaks / (1 - dpPersen / 100)

  const angsuran = Math.max(0, params.angsuran ?? kapasitas)
  // Tanpa penghasilan tidak ada rasio yang bisa dihitung. Melaporkan 0 —
  // yang berarti "aman" — akan menyatakan sesuatu yang belum diketahui,
  // jadi band ditahan di "aman" hanya bila memang tidak ada angsuran.
  const dsr = penghasilan > 0 ? (angsuran + komitmen) / penghasilan : 0

  return {
    penghasilan,
    komitmen,
    kapasitasAngsuran: Math.round(kapasitas),
    hargaMaksimum: Math.round(hargaMaks),
    angsuran: Math.round(angsuran),
    dsr,
    band: penghasilan > 0 ? bandKemampuan(dsr) : "aman",
    tenorTahun: tenor,
    uangMukaPersen: dpPersen,
    bungaPersen: bunga,
  }
}

export type Skenario = {
  /** Kunci stabil untuk React, bukan indeks. */
  id: string
  judul: string
  hasil: HasilKPR
  /** Selisih angsuran terhadap skenario yang sedang dipilih. */
  selisihAngsuran: number
  band: BandKemampuan | null
}

/**
 * Tiga skenario pembiayaan atas masukan yang sama: tenor lebih pendek, pilihan
 * pengunjung, dan tenor lebih panjang.
 *
 * Semuanya memanggil hitungKPR — tidak ada rumus kedua di sini. Yang
 * ditambahkan hanya pembingkaian: selisih terhadap pilihan sekarang, supaya
 * "tambah 5 tahun, angsuran turun Rp 380.000" terbaca tanpa mengurangkan dua
 * angka besar di kepala.
 */
export function skenario(params: {
  harga: number
  skema: SkemaKPR
  uangMukaPersen: number
  tenorTahun: number
  bungaPersen?: number
  konfig?: KonfigSkema
  /** Bila diisi, tiap skenario ikut membawa band kemampuannya. */
  penghasilan?: number
  komitmen?: number
}): Skenario[] {
  const konf = (params.konfig ?? SKEMA)[params.skema]
  const dasar = jepit(params.tenorTahun, 1, konf.tenorMax)

  // Skenario disaring unik: pada tenor 1 tahun "lebih pendek" jatuh ke 1 juga,
  // dan pada tenor maksimum "lebih panjang" jatuh ke nilai yang sama. Tanpa
  // penyaringan ini pengunjung melihat dua baris kembar dan mengira ada bug.
  const tenorUnik = [...new Set([
    Math.max(1, dasar - 5),
    dasar,
    Math.min(konf.tenorMax, dasar + 5),
  ])]

  const acuan = hitungKPR({ ...params, tenorTahun: dasar })

  return tenorUnik.map((t) => {
    const hasil = hitungKPR({ ...params, tenorTahun: t })
    const band =
      params.penghasilan && params.penghasilan > 0
        ? bandKemampuan((hasil.angsuranBulanan + (params.komitmen ?? 0)) / params.penghasilan)
        : null

    return {
      id: `tenor-${t}`,
      judul: `${t} tahun`,
      hasil,
      selisihAngsuran: hasil.angsuranBulanan - acuan.angsuranBulanan,
      band,
    }
  })
}

/**
 * Skema yang wajar untuk sebuah perumahan.
 *
 * Batas rumah subsidi mengikuti ketentuan harga jual maksimum. Angkanya
 * berbeda per wilayah dan ditinjau berkala; 240 juta adalah batas atas yang
 * aman untuk Sumatera Utara pada saat penulisan. Salah menebak di sini hanya
 * memilih tab bawaan yang kurang pas, bukan menghitung angka yang salah.
 */
export const BATAS_HARGA_SUBSIDI = 240_000_000

export function skemaBawaan(harga: number | null | undefined): SkemaKPR {
  return (harga ?? 0) <= BATAS_HARGA_SUBSIDI ? "subsidi" : "komersial"
}
