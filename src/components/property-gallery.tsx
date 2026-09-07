"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { blurFor } from "@/lib/image-blur"
import type { GalleryImage } from "@/lib/housing"

/**
 * Galeri foto halaman detail perumahan.
 *
 * Menggantikan satu <Image> sampul yang berdiri sendiri. Sampai sekarang
 * halaman ini hanya pernah menampilkan SATU foto, meski basis data sudah
 * menyimpan beberapa dan popup peta sudah menampilkannya sebagai slideshow —
 * jadi foto kedua dan ketiga yang diunggah admin tidak pernah dilihat siapa
 * pun di tempat yang paling penting.
 *
 * BLUR: prioritasnya blur milik barisnya sendiri (dibuat sharp saat unggah,
 * disimpan di housing_images.blur_data_url), baru jatuh ke peta statis
 * src/lib/image-blur.ts. Urutan itu bukan selera: peta statis dikunci pada
 * NAMA BERKAS 16 foto seed, dan foto unggahan bernama uuid tidak akan pernah
 * cocok dengannya.
 *
 * Sengaja bukan ImageSlideshow: komponen itu milik popup peta — tingginya
 * tetap, punya label ketersediaan sendiri, dan memuat i18n. Di sini yang
 * dibutuhkan foto besar dengan strip thumbnail, dan foto pertamanya adalah
 * LCP halaman.
 */
export default function PropertyGallery({
  images,
  title,
}: {
  images: GalleryImage[]
  title: string
}) {
  const [aktif, setAktif] = useState(0)
  const jumlah = images.length
  const stripRef = useRef<HTMLDivElement>(null)

  const ke = useCallback(
    (i: number) => setAktif(((i % jumlah) + jumlah) % jumlah),
    [jumlah],
  )

  // Thumbnail yang aktif digulirkan ke dalam pandangan. Tanpa ini, menekan
  // panah pada galeri sepuluh foto memindahkan sorotan ke thumbnail yang
  // berada di luar layar dan strip-nya diam saja.
  useEffect(() => {
    const anak = stripRef.current?.children[aktif] as HTMLElement | undefined
    anak?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
  }, [aktif])

  const foto = images[aktif]
  const blur = foto.blur ?? blurFor(foto.url)

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`Foto ${title}`}
      className="mt-8"
      onKeyDown={(e) => {
        if (jumlah < 2) return
        if (e.key === "ArrowLeft") {
          e.preventDefault()
          ke(aktif - 1)
        } else if (e.key === "ArrowRight") {
          e.preventDefault()
          ke(aktif + 1)
        }
      }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-border bg-secondary">
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
          <Image
            key={foto.url}
            src={foto.url}
            alt={foto.alt || title}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            // Hanya foto pertama yang priority: itu LCP halaman. Menandai
            // semuanya priority membuat browser mengunduh seluruh galeri
            // sebelum teks pertama tampil.
            priority={aktif === 0}
            placeholder={blur ? "blur" : "empty"}
            blurDataURL={blur}
            className="object-cover"
          />
        </div>

        {jumlah > 1 && (
          <>
            <button
              type="button"
              onClick={() => ke(aktif - 1)}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-e2 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => ke(aktif + 1)}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-e2 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <p className="text-coord numeric absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1.5 text-muted-foreground backdrop-blur-sm">
              {aktif + 1} / {jumlah}
            </p>
          </>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        Foto {aktif + 1} dari {jumlah}
      </p>

      {jumlah > 1 && (
        <div ref={stripRef} className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((g, i) => (
            <button
              key={g.url}
              type="button"
              onClick={() => setAktif(i)}
              aria-label={`Lihat foto ${i + 1}`}
              aria-current={i === aktif}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                i === aktif
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={g.url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
