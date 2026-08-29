"use client"

import type React from "react"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

/**
 * Login admin lewat Supabase Auth.
 *
 * Menggantikan lib/admin-auth.ts, yang membandingkan kata sandi dengan literal
 * "admin123" di sisi klien lalu menyetel localStorage.adminLogged = "true" —
 * dua baris yang bisa dipalsukan siapa pun dari konsol browser. Kini kredensial
 * diverifikasi server Auth, sesi disimpan di cookie httpOnly, dan otorisasi
 * sebenarnya ditegakkan RLS di basis data.
 *
 * Dipisah dari default export supaya useSearchParams() bisa dibungkus Suspense.
 * Sejak halaman ini keluar dari layout admin (route group `(secure)`), ia
 * dipra-render statis, dan Next menolak useSearchParams() tanpa batas Suspense
 * pada halaman yang dipra-render.
 */
function FormLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !data.user) {
      // Pesan sengaja tidak membedakan "email tidak terdaftar" dari "kata sandi
      // salah" — membedakannya memberi tahu penyerang alamat mana yang valid.
      setError("Email atau kata sandi tidak sesuai.")
      setPassword("")
      setIsLoading(false)
      return
    }

    // Punya akun bukan berarti punya akses. Peran bawaan setiap akun baru
    // adalah 'viewer'; kenaikan ke admin/pengembang dilakukan manual.
    const { data: profil } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle()

    if (!profil?.is_active || (profil.role !== "admin" && profil.role !== "pengembang")) {
      await supabase.auth.signOut()
      setError("Akun ini belum diberi akses ke dashboard. Hubungi administrator.")
      setPassword("")
      setIsLoading(false)
      return
    }

    const lanjut = searchParams.get("lanjut")
    router.push(lanjut && lanjut.startsWith("/admin") ? lanjut : "/admin")
    router.refresh()
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-secondary px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-glow-brand">
              <Lock className="h-7 w-7" />
            </div>
          </div>
          <p className="text-coord text-brand-orange-ink">Akses Terbatas</p>
          <h1 className="font-display mt-3 text-[length:var(--fs-display-m)] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Masuk dengan akun petugas untuk mengelola data perumahan
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-white p-8 shadow-e3"
        >
          <div className="mb-5">
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              placeholder="nama@bri.co.id"
              disabled={isLoading}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground">
              Kata sandi
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                placeholder="Masukkan kata sandi"
                className="pr-14"
                disabled={isLoading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              id="login-error"
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-50 p-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
              <p className="text-sm font-medium text-danger">{error}</p>
            </motion.div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Memproses..." : "Masuk"}
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Akun dibuat oleh administrator lewat Dashboard Supabase. Tidak ada
            pendaftaran mandiri.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-primary transition-all hover:gap-2.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke halaman utama
          </Link>
        </p>
      </motion.div>
    </main>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
          <p className="text-muted-foreground">Memuat…</p>
        </main>
      }
    >
      <FormLogin />
    </Suspense>
  )
}
