import { SKEMA, type SkemaKPR } from "@/lib/kpr"
import { formatIDR } from "@/lib/format"

/**
 * WhatsApp sebagai kelanjutan perjalanan, bukan kanal terpisah.
 *
 * Satu-satunya tempat nomor dinormalkan dan pesan disusun. Tombol WhatsApp
 * kini muncul di halaman detail, popup peta, kalkulator, perencana, dan pada
 * layar "terkirim" — lima permukaan yang, bila masing-masing merangkai
 * pesannya sendiri, akan mengirim lima bentuk yang berbeda untuk perumahan
 * yang sama. Petugas di seberang tidak melihat halaman mana yang menghasilkan
 * pesan itu; yang ia lihat hanya isinya, dan isinya harus selalu cukup untuk
 * menjawab tanpa bertanya ulang.
 *
 * Tiga aturan berkas ini:
 *
 *   1. TIDAK PERNAH menghitung sendiri. Angsuran, uang muka, dan anggaran
 *      datang dari hitungKPR/hitungKemampuan di src/lib/kpr.ts. Rumus kedua di
 *      sini berarti pesan WhatsApp menyebut angka yang berbeda dari layar yang
 *      baru saja dilihat pengunjung — dan yang diingat orang adalah yang
 *      paling murah.
 *   2. TIDAK PERNAH memungut sendiri. Seluruh isi pesan berasal dari argumen;
 *      yang tidak diberikan pemanggil tidak akan muncul. Khususnya penghasilan
 *      — lihat catatan pada KonteksWhatsApp.penghasilan.
 *   3. SELALU menutup dengan pernyataan estimasi bila ada angka. Sebuah tangkap
 *      layar percakapan WhatsApp beredar lebih jauh daripada halaman yang
 *      melahirkannya, dan design.md §7.3 tidak mengenal pengecualian untuk
 *      kanal.
 */

/**
 * Nomor Indonesia ke format wa.me (E.164 tanpa tanda plus).
 *   0812-3456-7890 -> 6281234567890
 *   +62 812 ...    -> 6281234567890
 */
export function nomorWa(phone: string | null | undefined): string | null {
  const angka = (phone ?? "").replace(/[^\d]/g, "")
  if (!angka) return null
  if (angka.startsWith("62")) return angka
  if (angka.startsWith("0")) return `62${angka.slice(1)}`
  if (angka.startsWith("8")) return `62${angka}`
  return angka
}

/**
 * Kontak WhatsApp pusat, sebagaimana dibaca dari app_settings.
 *
 * Bentuknya tinggal di sini, bukan di src/lib/queries/whatsapp.ts, semata agar
 * komponen klien boleh menyebutnya sebagai tipe prop. Berkas kueri itu diawali
 * `import "server-only"`, dan modul yang menyentuhnya dari bundel peramban
 * gagal saat build — sekalipun yang diambil hanya sebuah tipe.
 */
export type KontakWhatsApp = {
  /** E.164 tanpa plus, siap dipakai wa.me. */
  nomor: string
  label: string
  jam: string | null
}

/**
 * Nomor E.164 kembali menjadi bentuk lokal yang dibaca orang Indonesia.
 *   6281371901927 -> 0813 7190 1927
 *
 * Ada karena yang DISIMPAN hanya satu nilai. Menyimpan bentuk tampilannya
 * sebagai kolom kedua berarti dua nilai yang harus diubah bersama, dan yang
 * kedua akan tertinggal pada penggantian nomor pertama — persis duplikasi yang
 * dibereskan dengan menghapus PHONE_DISPLAY/PHONE_TEL dari footer dan dari
 * landing-view.
 *
 * Pengelompokan empat digit dipakai apa adanya: ia benar untuk nomor seluler
 * Indonesia (0813 7190 1927) dan tidak pernah salah baca untuk panjang lain,
 * hanya kurang lazim. Menebak pola per operator akan salah lebih sering
 * daripada berhasil.
 */
export function formatNomorTampil(nomor: string): string {
  const lokal = nomor.startsWith("62") ? `0${nomor.slice(2)}` : nomor
  return lokal.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
}

/**
 * Niat pengunjung saat menekan tombolnya.
 *
 * Bukan hiasan: niat menentukan kalimat pembuka DAN bidang mana yang pantas
 * ikut terkirim. Orang yang bertanya tentang satu perumahan tidak sedang
 * membuka pembicaraan tentang penghasilannya, dan mengirimkannya karena
 * kebetulan angka itu ada di memori halaman adalah pengungkapan yang tidak
 * diminta siapa pun.
 */
export type NiatWhatsApp =
  /** Bertanya tentang satu perumahan. */
  | "properti"
  /** Membahas kemampuan bayar dari simulasi yang baru diisi. */
  | "kemampuan"
  /** Bantuan umum: belum memilih perumahan, belum tentu soal angka. */
  | "bantuan"
  /** Melanjutkan percakapan setelah formulir minat benar-benar terkirim. */
  | "lanjutan"

export type KonteksWhatsApp = {
  /** Nama perumahan yang sedang dibicarakan. */
  perumahan?: string | null
  /** Harga terendah perumahan itu. */
  harga?: number | null
  skema?: SkemaKPR | null
  uangMukaPersen?: number | null
  uangMuka?: number | null
  tenorTahun?: number | null
  /** Estimasi angsuran bulanan, sebagaimana ditampilkan di layar. */
  angsuran?: number | null
  /**
   * Penghasilan bulanan yang dilaporkan sendiri.
   *
   * HANYA diteruskan oleh perencana pada niat 'kemampuan', dan hanya karena di
   * sanalah ia menjadi pokok pembicaraan: pertanyaan "sanggup berapa" tidak
   * bisa dijawab tanpa angka ini. Pengunjung tetap melihat seluruh pesan di
   * WhatsApp sebelum menekan kirim — pengungkapannya tindakan dia, bukan
   * tindakan kita — tetapi tombol yang menyertakannya wajib mengatakannya
   * lebih dulu di layar. Lihat kpr-planner.tsx.
   */
  penghasilan?: number | null
  /** Perkiraan harga rumah tertinggi yang masuk kapasitas itu. */
  anggaranMaks?: number | null
  /** Nama pengirim, bila sudah pernah diisikan di formulir. */
  nama?: string | null
  /** Pertanyaan pengunjung sendiri. */
  pesan?: string | null
  /** URL halaman perumahan, absolut. Lihat tautanProperti(). */
  tautan?: string | null
}

/** Batas panjang pesan; wa.me memuatnya di query string. */
const MAKS_PESAN = 1200
/** Batas kalimat pengunjung sendiri, dipangkas sebelum ikut disusun. */
const MAKS_PESAN_PENGUNJUNG = 400

const PEMBUKA: Record<NiatWhatsApp, (k: KonteksWhatsApp) => string> = {
  properti: (k) =>
    k.perumahan
      ? `Halo, saya ingin menanyakan KPR BRI untuk ${k.perumahan} yang saya lihat di situs KPR BRI Pematang Siantar.`
      : "Halo, saya ingin menanyakan salah satu perumahan di situs KPR BRI Pematang Siantar.",
  kemampuan: () =>
    "Halo, saya baru mencoba simulasi di situs KPR BRI Pematang Siantar dan ingin berdiskusi soal kemampuan bayar saya.",
  bantuan: () =>
    "Halo, saya ingin bertanya tentang KPR BRI di Pematang Siantar dan butuh bantuan untuk memulai.",
  lanjutan: (k) =>
    k.perumahan
      ? `Halo, saya baru saja mengirim permintaan dihubungi lewat situs KPR BRI untuk ${k.perumahan}. Saya ingin melanjutkan pembicaraannya di sini.`
      : "Halo, saya baru saja mengirim permintaan dihubungi lewat situs KPR BRI. Saya ingin melanjutkan pembicaraannya di sini.",
}

/**
 * Menyusun isi pesan.
 *
 * Bentuknya sengaja BARIS BERLABEL, bukan paragraf. Petugas membacanya di
 * layar ponsel sambil menyiapkan jawaban; "Estimasi angsuran: Rp 1.100.000 /
 * bulan" bisa dipindai dalam sekali lihat, sedangkan kalimat yang memuat angka
 * yang sama harus dibaca sampai habis. Baris yang datanya tidak ada tidak
 * ditulis sama sekali — "Harga mulai: -" hanya memindahkan pertanyaan, tidak
 * menjawabnya.
 */
export function susunPesan(niat: NiatWhatsApp, konteks: KonteksWhatsApp = {}): string {
  const k = konteks
  const baris: string[] = []

  if (k.nama) baris.push(`Nama: ${k.nama}`)
  if (k.perumahan) baris.push(`Perumahan: ${k.perumahan}`)
  if (k.harga != null && k.harga > 0) baris.push(`Harga mulai: ${formatIDR(k.harga)}`)
  if (k.skema) baris.push(`Skema: ${SKEMA[k.skema].label}`)

  if (k.uangMukaPersen != null) {
    const nominal = k.uangMuka != null && k.uangMuka > 0 ? ` · ${formatIDR(k.uangMuka)}` : ""
    baris.push(`Uang muka: ${k.uangMukaPersen}%${nominal}`)
  }
  if (k.tenorTahun != null) baris.push(`Jangka waktu: ${k.tenorTahun} tahun`)
  if (k.angsuran != null && k.angsuran > 0) {
    baris.push(`Estimasi angsuran: ${formatIDR(k.angsuran)} / bulan`)
  }
  if (k.penghasilan != null && k.penghasilan > 0) {
    baris.push(`Penghasilan bulanan: ${formatIDR(k.penghasilan)}`)
  }
  if (k.anggaranMaks != null && k.anggaranMaks > 0) {
    baris.push(`Perkiraan anggaran rumah: sampai ${formatIDR(k.anggaranMaks)}`)
  }

  const bagian: string[] = [PEMBUKA[niat](k)]
  if (baris.length > 0) bagian.push(baris.join("\n"))

  const pesan = (k.pesan ?? "").trim()
  if (pesan) bagian.push(`Pertanyaan saya:\n${potong(pesan, MAKS_PESAN_PENGUNJUNG)}`)

  // Penutup hanya dipasang bila memang ada angka yang perlu dibingkai. Pada
  // niat 'bantuan' tanpa satu pun angka, kalimat estimasi akan menjawab
  // pertanyaan yang belum diajukan.
  const penutup: string[] = []
  if (k.angsuran != null || k.anggaranMaks != null || (k.harga != null && k.harga > 0)) {
    penutup.push("Angka di atas estimasi dari situs, bukan penawaran kredit BRI.")
  }
  if (k.tautan) penutup.push(k.tautan)
  if (penutup.length > 0) bagian.push(penutup.join("\n"))

  return potong(bagian.join("\n\n"), MAKS_PESAN)
}

/**
 * Tautan wa.me lengkap, atau null bila nomornya tidak terpakai.
 *
 * Mengembalikan null — bukan tautan tanpa nomor — supaya pemanggil TIDAK
 * merender tombolnya sama sekali. Tombol WhatsApp yang mendarat di halaman
 * galat WhatsApp lebih buruk daripada tidak ada tombol: pengunjung menyimpulkan
 * kanalnya rusak, bukan bahwa nomornya belum diisi.
 */
export function tautanWa(
  phone: string | null | undefined,
  niat: NiatWhatsApp,
  konteks: KonteksWhatsApp = {},
): string | null {
  const nomor = nomorWa(phone)
  if (!nomor) return null
  return `https://wa.me/${nomor}?text=${encodeURIComponent(susunPesan(niat, konteks))}`
}

/**
 * Balasan pertama dari sisi PETUGAS, untuk tombol WhatsApp di /admin/prospek.
 *
 * Arah percakapannya terbalik, jadi suaranya pun terbalik — susunPesan() tidak
 * bisa dipakai ulang di sini tanpa mengirim "saya ingin menanyakan" dari mulut
 * orang yang seharusnya menjawab.
 *
 * Yang disebut ulang hanyalah apa yang PROSPEK ITU SENDIRI kirimkan. Petugas
 * menghubungi orang yang mungkin sudah mengisi formulir tiga hari lalu dan
 * sudah melihat belasan perumahan sejak itu; membuka dengan "estimasi angsuran
 * Rp 1.100.000 untuk Griya Asri" menempatkan keduanya pada percakapan yang
 * sama sebelum kalimat kedua. Penghasilan sengaja TIDAK ikut disebut: petugas
 * boleh melihatnya di dasbor, tetapi menuliskannya kembali ke WhatsApp berarti
 * memindahkan data itu ke perangkat yang tidak kita kendalikan atas inisiatif
 * kita sendiri, bukan atas inisiatif pemiliknya.
 */
export function pesanPetugas(konteks: {
  nama: string
  perumahan?: string | null
  angsuran?: number | null
  tenorTahun?: number | null
}): string {
  // Sapaan dan ucapan terima kasih SATU paragraf. Dipisah, pesannya terbuka
  // dengan empat baris berjarak untuk tiga kalimat — bentuk yang di WhatsApp
  // terbaca sebagai kiriman massal, dan pesan yang terbaca begitu tidak
  // dibalas.
  const baris = [
    `Halo Bapak/Ibu ${konteks.nama}, saya dari tim KPR BRI Pematang Siantar. ` +
      (konteks.perumahan
        ? `Terima kasih sudah mengirim permintaan informasi KPR untuk ${konteks.perumahan} lewat situs kami.`
        : "Terima kasih sudah mengirim permintaan informasi KPR lewat situs kami."),
  ]

  const ringkas: string[] = []
  if (konteks.angsuran != null && konteks.angsuran > 0) {
    ringkas.push(`estimasi angsuran ${formatIDR(konteks.angsuran)} per bulan`)
  }
  if (konteks.tenorTahun != null) ringkas.push(`jangka waktu ${konteks.tenorTahun} tahun`)
  if (ringkas.length > 0) {
    baris.push(
      `Simulasi yang Anda kirim: ${ringkas.join(", ")}. Angka itu estimasi, belum termasuk hasil analisa kredit.`,
    )
  }

  baris.push("Boleh saya bantu jelaskan langkah berikutnya?")
  return baris.join("\n\n")
}

/**
 * URL halaman perumahan yang absolut.
 *
 * Memakai NEXT_PUBLIC_SITE_URL, bukan window.location. Komponen tombolnya
 * dirender di server lebih dulu (ia komponen klien, tetapi tetap ikut SSR),
 * dan membaca window saat render membuat href server berbeda dari href klien —
 * React akan mengeluhkan hidrasi pada setiap kartu perumahan sekaligus. Nilai
 * NEXT_PUBLIC_ disisipkan saat build, jadi keduanya identik.
 *
 * Tanpa env itu tautannya dihilangkan, bukan ditebak: alamat yang salah
 * mengirim petugas ke halaman yang tidak ada.
 */
export function tautanProperti(slug: string | null | undefined): string | null {
  const asal = process.env.NEXT_PUBLIC_SITE_URL
  if (!asal || !slug) return null
  return `${asal.replace(/\/+$/, "")}/perumahan/${slug}`
}

function potong(teks: string, maks: number): string {
  return teks.length <= maks ? teks : `${teks.slice(0, maks - 1).trimEnd()}…`
}
