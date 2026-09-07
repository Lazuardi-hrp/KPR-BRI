"use client"

import { useEffect, useRef } from "react"
import { AlertCircle, MessageCircle, ShieldAlert } from "lucide-react"

import { Input } from "@/components/ui/input"
import TurnstileWidget from "@/components/turnstile-widget"
import { HONEYPOT, TEKS_PERSETUJUAN } from "@/lib/schemas/lead"
import { idSesiPublik } from "@/components/jejak"

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
 *
 * Kolom `sesi` justru ada di sini, dengan alasan yang sama seperti honeypot:
 * ia identik untuk kedua pemanggil dan bukan konteks siapa pun. Menyalinnya
 * ke dua tempat berarti salah satunya suatu hari akan tertinggal, dan
 * tertinggalnya tidak akan terlihat — formulirnya tetap terkirim, hanya
 * kaitan ke sesi peramban yang diam-diam hilang dari satu jalur.
 */

export type StatusVerifikasi = { turnstileTersedia: boolean }

export default function LeadFormFields({
  error,
  verifikasi,
  turnstileSiteKey,
  onToken,
  placeholderPesan,
  waTersedia = false,
  viaWa = false,
  onViaWa,
}: {
  error: string
  verifikasi: StatusVerifikasi | null
  turnstileSiteKey?: string
  onToken: (token: string) => void
  placeholderPesan: string
  /** Ada nomor WhatsApp yang bisa dituju. Tanpa itu pilihannya disembunyikan. */
  waTersedia?: boolean
  viaWa?: boolean
  onViaWa?: (nilai: boolean) => void
}) {
  /**
   * Id sesi peramban, diisi ke DOM setelah hidrasi.
   *
   * Ditulis lewat ref, BUKAN lewat state. Dua alasan, dan keduanya perlu:
   *
   *   * sessionStorage tidak ada di server. Membacanya saat render membuat
   *     markup server dan klien berbeda, dan React mengeluhkan hidrasi.
   *   * setState di dalam efek memicu render berjenjang tanpa satu pun
   *     manfaat di sini — nilainya tidak pernah dibaca React, hanya oleh
   *     FormData saat dikirim. Menulis langsung ke elemennya adalah persis
   *     kegunaan efek: menyelaraskan sistem di luar React.
   *
   * Kosong sesaat tidak merugikan: efek berjalan jauh sebelum ada manusia
   * yang sempat menekan tombol kirim.
   */
  const sesiRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (sesiRef.current) sesiRef.current.value = idSesiPublik() ?? ""
  }, [])

  return (
    <>
      {/*
        Menautkan prospek ini ke sesi yang sama dengan tampilan dan pemakaian
        kalkulator sebelumnya, supaya corong di /admin/analitik bisa mengukur
        perpindahan orang antar tahap alih-alih menjumlahkan peristiwa lepas.
        Bukan data prospek, dan karenanya tidak ada di LeadSchema.
      */}
      <input type="hidden" name="sesi" ref={sesiRef} defaultValue="" />

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

      {/*
        Pilihan kanal, bukan pilihan mengirim.

        Sengaja TIDAK punya atribut name: nilainya tidak ikut FormData sama
        sekali. Pemanggillah yang menerjemahkannya menjadi lead_kind, karena
        hanya ia yang tahu jenis apa yang berlaku bila kotak ini tidak
        dicentang ('kalkulator' di panel detail, 'form_minat' tanpa simulasi).
        Membiarkannya terkirim sebagai bidang sendiri berarti LeadSchema harus
        mengenal dua sumber untuk satu kolom, dan keduanya akan berselisih.

        Tidak tercentang secara bawaan. Mencentangkannya lebih dulu akan
        memilih kanal atas nama orang yang belum menyatakan apa pun, lalu
        menyimpan pilihan itu ke prospeknya sebagai kehendaknya.
      */}
      {waTersedia && onViaWa && (
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
            viaWa ? "border-ok/40 bg-ok-50" : "border-border bg-white hover:bg-secondary"
          }`}
        >
          <input
            type="checkbox"
            checked={viaWa}
            onChange={(e) => onViaWa(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
          />
          <span className="text-sm leading-relaxed">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <MessageCircle className="h-4 w-4 text-ok" aria-hidden />
              Lanjutkan lewat WhatsApp
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Setelah mengirim, Anda dapat langsung membuka percakapan berisi
              ringkasan simulasi ini. Petugas juga akan tahu untuk membalas ke
              WhatsApp, bukan menelepon.
            </span>
          </span>
        </label>
      )}

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
