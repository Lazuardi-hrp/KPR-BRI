"use client"

import { useCallback, useEffect } from "react"
import { motion } from "motion/react"
import { X, MapPin, Phone, Mail, User } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Coord } from "./coord"
import VerificationChip from "./verification-chip"
import ImageSlideshow from "./image-slideshow"
import { useFocusTrap } from "../hooks/use-focus-trap"
import type { Housing } from "../lib/housing"
import { useTranslation } from "../lib/i18n"

type HousingPopupProps = {
  housing: Housing
  onClose: () => void
}

export default function HousingPopup({ housing, onClose }: HousingPopupProps) {
  const { t, locale } = useTranslation()
  const close = useCallback(() => onClose(), [onClose])
  const dialogRef = useFocusTrap<HTMLDivElement>(true, close)

  // Lock body scrolling while the modal is open, restore on unmount.
  useEffect(() => {
    const scrollY = window.scrollY
    const { style } = document.body
    const prev = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      width: style.width,
    }
    // Fix the body in place so that setting overflow:hidden doesn't
    // snap it to the top (iOS + desktop Safari).
    style.overflow = "hidden"
    style.position = "fixed"
    style.top = `-${scrollY}px`
    style.width = "100%"

    return () => {
      style.overflow = prev.overflow
      style.position = prev.position
      style.top = prev.top
      style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Persentase kini dihitung basis data, bukan di sini: available_units adalah
  // generated column dan availability_percent berasal dari v_housing_public,
  // yang mengembalikan null saat total_units = 0. Pertahanan lama terhadap
  // angka mustahil (0% palsu, 562%) tidak lagi diperlukan — batasan
  // housings_units_ck membuat keadaan itu tak mungkin tersimpan.
  // Fallback lokal dipertahankan hanya untuk data yang belum lewat view.
  const totalUnits = housing.totalUnits ?? (housing.subsidiUnits ?? 0) + (housing.commercialUnits ?? 0)
  const availabilityPercent =
    housing.availabilityPercent !== undefined
      ? housing.availabilityPercent
      : totalUnits > 0 && housing.availableUnits <= totalUnits
        ? Math.round((housing.availableUnits / totalUnits) * 100)
        : null

  const availabilityStatus =
    availabilityPercent === null
      ? null
      : availabilityPercent > 50
        ? t.popup.availabilityHigh
        : availabilityPercent > 20
          ? t.popup.availabilityMedium
          : t.popup.availabilityLow

  // Three semantic colours, all ≥ 4.5:1 on white — replaces the
  // green-600 / yellow-600 / red-600 trio, two of which failed AA.
  const statusColor =
    availabilityPercent === null
      ? "text-foreground"
      : availabilityPercent > 50
        ? "text-ok"
        : availabilityPercent > 20
          ? "text-warn"
          : "text-danger"

  const specs = [
    { label: t.popup.roof, value: housing.roofType },
    { label: t.popup.wall, value: housing.wallType },
    { label: t.popup.floorFoundation, value: housing.foundationType, wide: true },
  ]

  const unitRows = [
    { label: t.popup.subsidy, note: t.popup.unitsAvailable, value: housing.subsidiUnits, tone: "brand" },
    { label: t.popup.subsidySold, note: t.popup.unitsSold, value: housing.soldSubsidiUnits, tone: "ok" },
    { label: t.popup.commercial, note: t.popup.unitsAvailable, value: housing.commercialUnits, tone: "warn" },
    { label: t.popup.commercialSold, note: t.popup.unitsSold, value: housing.soldCommercialUnits, tone: "neutral" },
  ] as const

  const toneClasses = {
    brand: "border-border bg-accent",
    ok: "border-border bg-ok-50",
    warn: "border-border bg-warn-50",
    neutral: "border-border bg-secondary",
  }
  const toneLabel = {
    brand: "text-primary",
    ok: "text-ok",
    warn: "text-warn",
    neutral: "text-muted-foreground",
  }
  const toneFigure = {
    brand: "text-primary",
    ok: "text-ok",
    warn: "text-warn",
    neutral: "text-foreground",
  }

  const contacts = [
    { icon: User, label: t.popup.salesAgent, value: housing.contactPerson, href: undefined },
    { icon: Phone, label: t.common.phone, value: housing.phone, href: `tel:${housing.phone}` },
    // Email kontak sengaja dikosongkan saat migrasi: alamat lama adalah domain
    // fiktif. Barisnya disembunyikan sampai tim BRI mengisi yang sebenarnya —
    // lebih baik tidak ada daripada "mailto:null".
    ...(housing.email
      ? [{ icon: Mail, label: t.common.email, value: housing.email, href: `mailto:${housing.email}` }]
      : []),
  ].filter((c) => c.value)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9998] bg-ink/60 backdrop-blur-sm"
        onClick={close}
      />

      <div className="pointer-events-none fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center sm:p-0">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-judul"
          tabIndex={-1}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="pointer-events-auto flex max-h-[85vh] w-full flex-col outline-none sm:max-h-[90vh] sm:w-auto sm:max-w-2xl"
        >
          <Card className="relative flex min-h-0 flex-col overflow-hidden rounded-t-2xl shadow-e4 sm:rounded-2xl">
            {/* Close button — sticky to the Card's visual top, never scrolls away */}
            <button
              type="button"
              onClick={close}
              aria-label={t.common.close}
              className="absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4 sm:top-4"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Scrollable content area — image + all details scroll together */}
            <div data-lenis-prevent className="modal-scroll-area min-h-0 flex-1 overflow-y-auto">
              <ImageSlideshow
                images={
                  (housing.images?.length ? housing.images : [housing.image]).filter(
                    Boolean,
                  ) as string[]
                }
                title={housing.name}
                statusLabel={
                  availabilityStatus
                    ? `${t.popup.availability}: ${availabilityStatus}`
                    : `${housing.availableUnits.toLocaleString(locale === "id" ? "id-ID" : "en-US")} ${t.common.unitAvailable}`
                }
                statusColor={statusColor}
              />

              <div className="space-y-5 p-4 sm:p-6 md:p-8 md:space-y-6">
                {/* Title & location */}
                <div className="border-b border-border pb-4 md:pb-5">
                  <h2
                    id="popup-judul"
                    className="font-display text-[length:var(--fs-display-m)] font-bold leading-[1.1] tracking-[-0.025em] text-foreground"
                  >
                    {housing.name}
                  </h2>
                  <Coord lat={housing.lat} lng={housing.lng} as="div" className="mt-2.5" />
                  <VerificationChip
                    status={housing.verificationStatus}
                    verifiedAt={housing.verifiedAt}
                    className="mt-3"
                  />
                  <div className="mt-3 flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-sky-ink" />
                    <span className="text-xs sm:text-sm">{housing.description}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="numeric inline-block rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-primary sm:text-sm">
                      {housing.priceRange}
                    </span>
                    {availabilityPercent !== null && (
                      <span className="numeric inline-block rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground sm:text-sm">
                        {availabilityPercent}% {t.popup.available}
                      </span>
                    )}
                  </div>
                </div>

                {/* Spesifikasi Teknis */}
                <div className="border-b border-border pb-4 md:pb-5">
                  <h3 className="text-coord mb-4 text-brand-orange-ink">{t.popup.techSpecs}</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    {specs.map((spec) => (
                      <div
                        key={spec.label}
                        className={`rounded-2xl border border-border bg-secondary p-3 md:p-4 ${spec.wide ? "sm:col-span-2" : ""}`}
                      >
                        <p className="text-xs font-semibold text-muted-foreground">{spec.label}</p>
                        <p className="mt-1 truncate text-xs font-bold text-foreground sm:text-sm">
                          {spec.value || t.common.noData}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Rumah */}
                <div>
                  <h3 className="text-coord mb-4 text-brand-orange-ink">{t.popup.housingStatus}</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {unitRows.map((row) => (
                      <div
                        key={row.label}
                        className={`flex items-center justify-between rounded-2xl border p-3 sm:p-4 ${toneClasses[row.tone]}`}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className={`text-xs font-semibold uppercase tracking-wide ${toneLabel[row.tone]}`}>
                            {row.label}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{row.note}</p>
                        </div>
                        <p
                          className={`font-display numeric ml-2 flex-shrink-0 text-lg font-bold sm:text-2xl md:text-3xl ${toneFigure[row.tone]}`}
                        >
                          {row.value?.toLocaleString(locale === "id" ? "id-ID" : "en-US") ?? "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h3 className="text-coord mb-4 text-brand-orange-ink">{t.popup.contactAgent}</h3>
                  <div className="space-y-3 rounded-2xl border border-border bg-secondary p-4 md:p-5">
                    {contacts.map((c) => (
                      <div key={c.label} className="flex items-start gap-3">
                        <span className="flex-shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                          <c.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{c.label}</p>
                          {c.href ? (
                            <a
                              href={c.href}
                              className="break-all text-xs font-bold text-primary hover:underline sm:text-sm"
                            >
                              {c.value}
                            </a>
                          ) : (
                            <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                              {c.value}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row md:pt-5">
                  <Button asChild className="flex-1">
                    <a href={`tel:${housing.phone}`}>{t.popup.callNow}</a>
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={close}>
                    {t.common.close}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
