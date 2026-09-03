"use client"

import { useEffect, useRef } from "react"

/**
 * Widget Cloudflare Turnstile.
 *
 * Skripnya dimuat hanya ketika widget ini benar-benar dipasang — yaitu ketika
 * sebuah permintaan sudah ditandai mencurigakan. Pengunjung biasa tidak pernah
 * mengunduh satu byte pun dari Cloudflare, sehingga jalur normal tetap cepat
 * dan tidak menambah pihak ketiga yang mengamati mereka.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
        },
      ) => string
      remove: (id: string) => void
    }
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

export default function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string
  onToken: (token: string) => void
}) {
  const kotak = useRef<HTMLDivElement>(null)
  // Callback disimpan di ref supaya efek di bawah tidak perlu memasangnya
  // sebagai dependensi — kalau iya, setiap render induk akan merender ulang
  // widgetnya dan tantangan yang sedang dikerjakan pengguna hilang.
  // Penyalinannya lewat efek, bukan saat render: menulis ref saat render
  // membuat hasilnya bergantung pada kapan React kebetulan merender ulang.
  const simpanan = useRef(onToken)
  useEffect(() => {
    simpanan.current = onToken
  }, [onToken])

  useEffect(() => {
    let widgetId: string | undefined
    let batal = false

    function render() {
      if (batal || !kotak.current || !window.turnstile) return
      widgetId = window.turnstile.render(kotak.current, {
        sitekey: siteKey,
        callback: (t) => simpanan.current(t),
        theme: "light",
      })
    }

    if (window.turnstile) {
      render()
    } else {
      // Beberapa formulir bisa berada di satu halaman; skripnya cukup sekali.
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)
      if (!s) {
        s = document.createElement("script")
        s.src = SRC
        s.async = true
        s.defer = true
        document.head.appendChild(s)
      }
      s.addEventListener("load", render, { once: true })
    }

    return () => {
      batal = true
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          // Widget sudah dilepas bersama DOM-nya; tidak ada yang perlu dibereskan.
        }
      }
    }
  }, [siteKey])

  return <div ref={kotak} className="flex justify-center" />
}
