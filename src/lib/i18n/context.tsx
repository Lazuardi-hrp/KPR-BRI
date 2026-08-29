"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Locale, Translations } from "./types"
import { id as idTranslations } from "./id"
import { en as enTranslations } from "./en"

const dictionaries: Record<Locale, Translations> = {
  id: idTranslations,
  en: enTranslations,
}

const STORAGE_KEY = "kpr-bri-locale"

interface LanguageContextValue {
  locale: Locale
  t: Translations
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

/**
 * Read the preferred locale from localStorage.
 * Falls back to "id" (Bahasa Indonesia) when nothing is stored.
 */
function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "id"
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "en" || stored === "id") return stored
  } catch {
    // Private browsing, SSR, etc.
  }
  return "id"
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id")
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setLocaleState(getStoredLocale())
    setMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // Ignore write failures
    }
    // Update the <html lang> attribute
    document.documentElement.lang = newLocale
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === "id" ? "en" : "id")
  }, [locale, setLocale])

  // Keep <html lang> in sync
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale
    }
  }, [locale, mounted])

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      t: dictionaries[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/**
 * Hook to access translations and the current locale.
 *
 * ```tsx
 * const { t, locale, toggleLocale } = useTranslation()
 * ```
 */
export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useTranslation must be used inside <LanguageProvider>")
  }
  return ctx
}
