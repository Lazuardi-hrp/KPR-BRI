"use client"

import { AnimatePresence, motion } from "motion/react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useState } from "react"
import { cn } from "../lib/utils"
import { blurFor } from "../lib/image-blur"
import { useTranslation } from "../lib/i18n"

interface ImageSlideshowProps {
  images: string[]
  /**
   * Blur per foto, sejajar indeks dengan `images`.
   *
   * Ada sejak foto bisa diunggah dari dashboard: blurFor() mengunci placeholder
   * pada nama berkas enam belas foto seed, dan unggahan baru bernama uuid tidak
   * akan pernah cocok. Nilai yang benar sudah tersimpan per baris di basis data
   * dan dibawa ke sini lewat `Housing.gallery`. Opsional — pemanggil yang tidak
   * punya galeri tetap jatuh ke peta statis.
   */
  blurs?: (string | null | undefined)[]
  title: string
  /** Pre-composed availability sentence — the popup decides what the data supports. */
  statusLabel: string
  /** Tailwind text-colour class for the availability status. */
  statusColor: string
}

export default function ImageSlideshow({
  images,
  blurs,
  title,
  statusLabel,
  statusColor,
}: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const displayImages = images && images.length > 0 ? images : ["/placeholder.svg"]
  const count = displayImages.length
  const { t } = useTranslation()

  const goToPrevious = useCallback(
    () => setCurrentIndex((prev) => (prev === 0 ? count - 1 : prev - 1)),
    [count],
  )
  const goToNext = useCallback(
    () => setCurrentIndex((prev) => (prev === count - 1 ? 0 : prev + 1)),
    [count],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (count < 2) return
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      goToPrevious()
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      goToNext()
    }
  }

  const src = displayImages[currentIndex] || "/placeholder.svg"
  const blur = blurs?.[currentIndex] ?? blurFor(src)

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${t.slideshow.photoOf} ${title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative h-40 overflow-hidden bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:h-56 md:h-72"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <Image
            src={src}
            alt={`${title} — ${t.slideshow.photoNofM.replace("{n}", String(currentIndex + 1)).replace("{m}", String(count))}`}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            placeholder={blur ? "blur" : "empty"}
            blurDataURL={blur ?? undefined}
            // The optimizer refuses SVG by default; the fallback ships as-is.
            unoptimized={src.endsWith(".svg")}
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />

      <p aria-live="polite" className="sr-only">
        {t.slideshow.photoNofM.replace("{n}", String(currentIndex + 1)).replace("{m}", String(count))}
      </p>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label={t.slideshow.previousPhoto}
            className="absolute left-1.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-3"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label={t.slideshow.nextPhoto}
            className="absolute right-1.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-3"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="text-coord numeric absolute right-2 top-2 z-10 rounded-full bg-background/90 px-2.5 py-1.5 text-muted-foreground backdrop-blur-sm sm:right-3 sm:top-3">
            {currentIndex + 1} / {count}
          </div>
        </>
      )}

      <div className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-between gap-2 sm:inset-x-4 sm:bottom-3">
        <div className="w-fit rounded-lg bg-background/95 px-2.5 py-1.5 backdrop-blur-sm">
          <span className={cn("text-xs font-semibold sm:text-sm", statusColor)}>
            {statusLabel}
          </span>
        </div>

        {count > 1 && (
          <div className="flex gap-1.5">
            {displayImages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={t.slideshow.viewPhoto.replace("{n}", String(index + 1))}
                aria-current={index === currentIndex}
                className="group flex h-6 w-6 items-center justify-center focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    index === currentIndex
                      ? "w-6 bg-brand-orange"
                      : "w-1.5 bg-white/60 group-hover:bg-white/90 group-focus-visible:bg-white",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
