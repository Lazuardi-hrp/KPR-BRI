"use client"

import Link from "next/link"
import { ArrowRight, MapPin, Home, Users, Shield } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import Image from "next/image"
import { AnimatedCounter } from "../components/animated-counter"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* LEFT: Logo + Nama Website */}
            <div className="flex items-center gap-3">
              <div className="relative w-32 h-32">
                <Image
                  src="/logokpr.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-22 h-22">
                <Image
                  src="/logobri.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-pretty mb-6 text-foreground">
                Temukan Rumah Impian Anda di Pematang Siantar
              </h1>
              <p className="text-xl text-muted-foreground mb-8 text-pretty">
                Jelajahi berbagai pilihan perumahan modern dengan fasilitas lengkap dan lokasi strategis. Cari dengan
                mudah menggunakan peta interaktif kami.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/map">
                  <Button size="lg" className="w-full sm:w-auto">
                    Lihat Peta Perumahan
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="destructive" size="lg" className="w-full sm:w-auto bg-transparent border">
                    Pelajari Lebih Lanjut
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative pl-[65px] h-[500px] bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl overflow-hidden">
              <img
                src="/rumah.png"
                alt="Perumahan Modern"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Mengapa Memilih Kami?</h2>
            <p className="text-xl text-muted-foreground">
              Platform terpercaya untuk menemukan perumahan terbaik di Pematang Siantar
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature Cards */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Peta Interaktif</h3>
              <p className="text-muted-foreground">
                Jelajahi lokasi perumahan dengan peta interaktif yang mudah digunakan
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Detail Lengkap</h3>
              <p className="text-muted-foreground">
                Informasi lengkap tentang setiap unit termasuk harga, tipe, dan fasilitas
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Tim Profesional</h3>
              <p className="text-muted-foreground">Bantuan dari tim ahli real estate yang siap membantu Anda</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Terpercaya</h3>
              <p className="text-muted-foreground">Data verifikasi dan transparansi harga di setiap penawaran</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <AnimatedCounter end={25} suffix="+" />
              <p className="text-lg text-muted-foreground">Perumahan Terdaftar</p>
            </div>
            <div>
              <AnimatedCounter end={500} suffix="+" />
              <p className="text-lg text-muted-foreground">Unit Rumah Tersedia</p>
            </div>
            <div>
              <AnimatedCounter end={1000} suffix="+" />
              <p className="text-lg text-muted-foreground">Pelanggan Puas</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-16 text-center">Cara Menggunakan Platform</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Buka Peta</h3>
              <p className="text-center text-muted-foreground">
                Kunjungi halaman peta perumahan dan lihat semua lokasi tersedia
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Klik Lokasi</h3>
              <p className="text-center text-muted-foreground">
                Pilih titik perumahan untuk melihat detail lengkap dan informasi harga
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Hubungi Kami</h3>
              <p className="text-center text-muted-foreground">
                Hubungi tim kami untuk informasi lebih lanjut dan kunjungan lokasi
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Siap Menemukan Rumah Impian?</h2>
          <p className="text-lg opacity-90 mb-8">
            Mulai jelajahi berbagai pilihan perumahan di Pematang Siantar sekarang juga
          </p>
          <Link href="/map">
            <Button size="lg" variant="secondary">
              Lihat Peta Perumahan Sekarang
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/5 border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-6 h-6 text-primary" />
                <span className="font-bold">Perumahan PS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Platform pencarian perumahan terpercaya di Pematang Siantar
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Navigasi</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/map" className="text-muted-foreground hover:text-foreground">
                    Peta Perumahan
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="text-muted-foreground hover:text-foreground">
                    Fitur
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="text-muted-foreground hover:text-foreground">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kontak</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: info@perumahanps.com</li>
                <li>Telepon: (0621) 123-4567</li>
                <li>Alamat: Pematang Siantar, Sumatera Utara</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Informasi</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Kebijakan Privasi
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    Syarat & Ketentuan
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-foreground">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Perumahan Pematang Siantar. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
