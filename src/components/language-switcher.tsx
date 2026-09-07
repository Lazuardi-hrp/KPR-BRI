"use client"

import { useTranslation } from "../lib/i18n"
import { cn } from "../lib/utils"

interface LanguageSwitcherProps {
  className?: string
  /** Use compact mode for tight spaces (nav). */
  compact?: boolean
}

/**
 * A toggle button that switches between Bahasa Indonesia and English.
 * Shows the flag emoji + locale code; the aria-label tells the user
 * what clicking will do.
 */
export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { locale, toggleLocale, t } = useTranslation()

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t.langSwitcher.switchTo}
      title={t.langSwitcher.switchTo}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        compact && "px-2 py-1",
        className,
      )}
    >
      <span aria-hidden className="text-sm leading-none">
        {locale === "id" ? "🇮🇩" : "🇬🇧"}
      </span>
      <span className="uppercase">{locale === "id" ? "ID" : "EN"}</span>
    </button>
  )
}
