"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, MapPin, SearchX } from "lucide-react"

import { coverBlur } from "@/lib/image-blur"
import { formatIDR } from "@/lib/format"
import { Coord } from "@/components/coord"
import VerificationChip from "@/components/verification-chip"
import type { Housing } from "@/lib/housing"

/**
 * Perumahan yang harganya masuk perkiraan anggaran pengunjung.
 *
 * Penyaringannya di klien, bukan lewat search_housings. Ada 16 perumahan
 * terbit dan seluruhnya sudah ada di memori halaman (getPublishedHousings,
 * ISR 5 menit), jadi menyaring di sini membuat daftarnya ikut berubah pada
 * frame yang sama dengan slidernya. RPC-nya juga tidak membawa foto, dan satu
 * perjalanan jaringan per geseran slider adalah harga yang tidak sepadan
 * untuk jumlah baris sebanyak ini.
 *
 * URUTANNYA disengaja: dari yang PALING MENDEKATI plafon, bukan yang paling
 * murah. Orang yang mengetik penghasilannya sedang bertanya "sebaik apa yang
 * bisa saya jangkau", dan menempatkan rumah termurah di depan menjawab
 * pertanyaan yang tidak ia ajukan.
 */

/** Potong alamat panjang menjadi baris lokasi yang terbaca. Sama seperti
 *  shortLocation() di perumahan-collection.tsx. */
function lokasiSingkat(description: string) {
  const parts = description.split(",").map((p) => p.trim())
  const tail = parts.slice(-2).filter(Boolean)
  return tail.length ? tail.join(", ") : description
}

export function cocokDenganAnggaran(items: Housing[], hargaMaksimum: number, batas = 4) {
  if (!Number.isFinite(hargaMaksimum) || hargaMaksimum <= 0) return []

  return items
    .filter((h) => h.priceMin != null && h.priceMin > 0 && h.priceMin <= hargaMaksimum)
    .sort((a, b) => (b.priceMin ?? 0) - (a.priceMin ?? 0))
    .slice(0, batas)
}

export default function BudgetMatches({
  items,
  hargaMaksimum,
  /** Perumahan yang sedang dilihat, supaya tidak disarankan kepada dirinya sendiri. */
  kecualikanId,
}: {
  items: Housing[]
  hargaMaksimum: number
  kecualikanId?: string
}) {
  const cocok = cocokDenganAnggaran(
    kecualikanId ? items.filter((h) => h.id !== kecualikanId) : items,
    hargaMaksimum,
  )

  // Keadaan kosong harus tetap berguna. Daftar yang menghilang tanpa kalimat
  // membuat pengunjung mengira halamannya rusak, padahal jawabannya ada dan
  // dapat ditindaklanjuti: ubah salah satu dari tiga hal.
  if (cocok.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary p-5 text-center">
        <SearchX className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-foreground">
          Belum ada perumahan di bawah perkiraan anggaran ini
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Coba perpanjang jangka waktu, tambah uang muka, atau kurangi cicilan lain untuk
          memperbesar perkiraan anggaran Anda. Anda juga tetap bisa meninggalkan nomor di
          bawah — petugas dapat membantu mencarikan pilihan lain.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Perumahan berikut harga terendahnya berada di bawah perkiraan anggaran Anda
        ({formatIDR(hargaMaksimum)}). Ini bukan rekomendasi atau persetujuan BRI —
        hanya penyaringan berdasarkan angka yang Anda isikan.
      </p>

      <ul className="mt-4 space-y-3">
        {cocok.map((h) => (
          <li key={h.id}>
            <Link
              href={h.slug ? `/perumahan/${h.slug}` : "/map"}
              className="lift group flex h-full gap-3 overflow-hidden rounded-2xl border border-border bg-white p-3 hover:border-primary/30"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                <Image
                  src={h.image || "/rumah.webp"}
                  alt=""
                  fill
                  sizes="80px"
                  placeholder={coverBlur(h) ? "blur" : "empty"}
                  blurDataURL={coverBlur(h)}
                  className="lift-img object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="truncate text-sm font-bold text-foreground">{h.name}</h4>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden
                  />
                </div>

                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{lokasiSingkat(h.description)}</span>
                </p>

                <p className="numeric mt-1 text-sm font-bold text-primary">
                  {h.priceMin != null ? formatIDR(h.priceMin) : h.priceRange}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Coord lat={h.lat} lng={h.lng} />
                  <VerificationChip status={h.verificationStatus} verifiedAt={h.verifiedAt} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
