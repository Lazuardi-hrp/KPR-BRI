import type React from "react"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SmoothScroll } from "../components/motion/smooth-scroll"
import { LanguageProvider } from "../lib/i18n"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jkt",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "KPR Bersubsidi BRI — Perumahan Pematang Siantar",
  description:
    "Platform pencarian perumahan dengan peta interaktif di Pematang Siantar. Temukan rumah impian dengan program KPR bersubsidi BRI yang terjangkau.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
