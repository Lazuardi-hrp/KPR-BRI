"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "motion/react"
import { ArrowRight, Menu, X } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import { useFocusTrap } from "../hooks/use-focus-trap"
import { useTranslation } from "../lib/i18n"
import { LanguageSwitcher } from "./language-switcher"

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24))

  const close = useCallback(() => setOpen(false), [])
  const drawerRef = useFocusTrap<HTMLDivElement>(open, close)

  const { t } = useTranslation()

  const links = [
    { href: "#keuntungan", label: t.chapters.benefits },
    { href: "#cara", label: t.chapters.howItWorks },
    { href: "#perumahan", label: t.chapters.housing },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "border-border bg-white/95 shadow-e3 backdrop-blur-md"
            : "border-transparent bg-white",
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:h-20">
            <Link href="/" className="flex items-center">
              <div className="relative h-12 w-24 sm:h-14 sm:w-32">
                <Image
                  src="/logokpr.webp"
                  alt="KPR BRI"
                  fill
                  sizes="(max-width: 640px) 96px, 128px"
                  className="object-contain object-left"
                  priority
                />
              </div>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="underline-draw text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <div className="relative h-9 w-12 sm:h-11 sm:w-16">
                <Image
                  src="/logobri.webp"
                  alt="BRI"
                  fill
                  sizes="64px"
                  className="object-contain"
                  priority
                />
              </div>
              <LanguageSwitcher compact />
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/map">
                  {t.common.viewMap}
                  <ArrowRight />
                </Link>
              </Button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={t.common.openMenu}
                aria-expanded={open}
                aria-controls="menu-utama"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-[60] bg-ink/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={t.common.menu}
              id="menu-utama"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[61] flex w-[min(20rem,88vw)] flex-col bg-white p-6 shadow-e4 outline-none md:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-coord text-brand-orange-ink">{t.common.menu}</span>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t.common.closeMenu}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-8 flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    className="font-display rounded-2xl px-3 py-3 text-xl font-bold text-foreground transition-colors hover:bg-secondary"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-4">
                <LanguageSwitcher />
              </div>

              <Button asChild size="lg" className="mt-auto w-full">
                <Link href="/map" onClick={close}>
                  {t.common.viewMap}
                  <ArrowRight />
                </Link>
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
