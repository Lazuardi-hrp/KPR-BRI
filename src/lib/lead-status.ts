import type { Database } from "@/lib/database.types"

export type StatusProspek = Database["public"]["Enums"]["lead_status"]
export type JenisProspek = Database["public"]["Enums"]["lead_kind"]

/**
 * Satu-satunya sumber label dan warna siklus hidup prospek.
 *
 * Daftar dan kotak masuk sama-sama membacanya dari sini. Ketika keduanya
 * memelihara salinan sendiri, cepat atau lambat satu layar menyebut tahap
 * yang sama dengan dua nama, dan tim tidak lagi yakin sedang melihat hal yang
 * sama. Urutan larik ini juga menentukan urutan tahap di layar.
 */
export const URUTAN_STATUS: StatusProspek[] = [
  "baru",
  "dihubungi",
  "terkualifikasi",
  "tindak_lanjut",
  "pengajuan",
  "disetujui",
  "ditolak",
  "ditutup",
]

export const LABEL_STATUS: Record<StatusProspek, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  terkualifikasi: "Terkualifikasi",
  tindak_lanjut: "Tindak lanjut",
  pengajuan: "Pengajuan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  ditutup: "Ditutup",
}

export const LENCANA_STATUS: Record<StatusProspek, string> = {
  baru: "bg-brand-orange-50 text-brand-orange-ink",
  dihubungi: "bg-brand-sky-50 text-brand-sky-ink",
  terkualifikasi: "bg-accent text-primary",
  tindak_lanjut: "bg-warn-50 text-warn",
  pengajuan: "bg-accent text-primary",
  disetujui: "bg-ok-50 text-ok",
  ditolak: "bg-danger-50 text-danger",
  ditutup: "bg-secondary text-muted-foreground",
}

/** Tahap akhir — cerminan public.lead_status_final() di basis data. */
export const STATUS_FINAL: StatusProspek[] = ["disetujui", "ditolak", "ditutup"]

export const isFinal = (s: StatusProspek) => STATUS_FINAL.includes(s)

export const LABEL_JENIS: Record<JenisProspek, string> = {
  form_minat: "Formulir minat",
  kalkulator: "Simulasi KPR",
  ajukan_kpr: "Ajukan KPR",
  minta_info: "Permintaan info",
  whatsapp: "WhatsApp",
}

/**
 * Tahap berikutnya yang wajar dari sebuah tahap.
 *
 * Bukan pembatasan yang ditegakkan — petugas tetap boleh melompat ke tahap
 * mana pun lewat pemilih penuh. Ini hanya menaikkan langkah yang paling
 * mungkin ke tombol utama supaya jalur normal cukup satu klik.
 */
export function tahapBerikut(s: StatusProspek): StatusProspek | null {
  const peta: Partial<Record<StatusProspek, StatusProspek>> = {
    baru: "dihubungi",
    dihubungi: "terkualifikasi",
    terkualifikasi: "pengajuan",
    tindak_lanjut: "pengajuan",
    pengajuan: "disetujui",
  }
  return peta[s] ?? null
}

/** Sudah lewat batas SLA dan belum tersentuh. */
export function terlambat(status: StatusProspek, dueAt: string | null): boolean {
  return status === "baru" && dueAt != null && new Date(dueAt).getTime() < Date.now()
}
