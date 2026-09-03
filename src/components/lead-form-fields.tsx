"use client"

import { AlertCircle, ShieldAlert } from "lucide-react"

import { Input } from "@/components/ui/input"
import TurnstileWidget from "@/components/turnstile-widget"
import { HONEYPOT, TEKS_PERSETUJUAN } from "@/lib/schemas/lead"

/**
 * Bagian dalam formulir minat: honeypot, galat, verifikasi, isian, persetujuan.
 *
 * Diangkat keluar dari KprPanel ketika /simulasi ikut memerlukannya. Menyalin
 * blok ini akan berarti dua salinan sinyal anti-bot yang bisa menyimpang, dan
 * salinan yang tertinggal justru yang paling berbahaya: ia tetap terlihat
 * berfungsi, hanya berhenti menahan apa pun. Satu sumber, dua pemakai.
 *
 * Yang TIDAK ada di sini: elemen <form> dan tombol kirimnya. Kedua pemanggil
 * mengurus kolom tersembunyinya sendiri (housing_id, konteks simulasi) dan
 * menulis label tombol yang sesuai konteksnya masing-masing.
 */

export type StatusVerifikasi = { turnstileTersedia: boolean }

export default function LeadFormFields({
  error,
  verifikasi,
  turnstileSiteKey,
  onToken,
  placeholderPesan,
}: {
  error: string
  verifikasi: StatusVerifikasi | null
  turnstileSiteKey?: string
  onToken: (token: string) => void
  placeholderPesan: string
}) {
  return (
    <>
      {/*
        Kolom jebakan. Disembunyikan lewat CSS (bukan type="hidden", yang
        justru dilewati bot yang teliti) dan dikeluarkan dari urutan tab
        serta dari pembaca layar, sehingga tidak pernah menghalangi manusia.
      */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website-cadangan">Jangan diisi</label>
        <input
          id="website-cadangan"
          type="text"
          name={HONEYPOT}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-50 p-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}

      {verifikasi && (
        <div role="alert" className="rounded-xl border border-warn/30 bg-warn-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldAlert className="h-4 w-4 shrink-0 text-warn" aria-hidden />
            Verifikasi keamanan diperlukan
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Kami mendeteksi aktivitas yang tidak biasa. Mohon selesaikan verifikasi
            berikut sebelum melanjutkan.
          </p>

          <div className="mt-3">
            {verifikasi.turnstileTersedia && turnstileSiteKey ? (
              <TurnstileWidget siteKey={turnstileSiteKey} onToken={onToken} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Verifikasi otomatis belum tersedia. Silakan hubungi petugas melalui
                nomor kontak pemasaran yang tertera di halaman ini.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Nama lengkap</span>
          <Input name="name" required minLength={2} maxLength={120} placeholder="Nama Anda" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-foreground">Nomor telepon</span>
          <Input name="phone" required inputMode="tel" placeholder="0812 3456 7890" />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-foreground">
          Email <span className="font-normal text-muted-foreground">(opsional)</span>
        </span>
        <Input name="email" type="email" placeholder="nama@email.com" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-foreground">
          Pesan <span className="font-normal text-muted-foreground">(opsional)</span>
        </span>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          placeholder={placeholderPesan}
          className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </label>

      {/* Tidak tercentang secara bawaan. UU PDP mensyaratkan tindakan afirmatif,
          dan basis data menolak prospek tanpa jejak persetujuan. */}
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary p-4">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-input"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">{TEKS_PERSETUJUAN}</span>
      </label>
    </>
  )
}
