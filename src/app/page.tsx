"use client"

import Link from "next/link"
import { ArrowRight, MapPin, Home, Users, Shield } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import Image from "next/image"
import { AnimatedCounter } from "../components/animated-counter"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#003d82]/5 to-transparent shadow-sm border-b border-[#003d82]/10">
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
      <section className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#003d82]/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <div className="inline-block bg-[#003d82] text-white px-4 py-2 rounded-lg font-semibold text-sm mb-4">
                MILIKI RUMAH IMPIAN
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-pretty mb-4 text-[#003d82]">
                KPR Bersubsidi BRI
              </h1>
              <p className="text-lg text-gray-700 mb-2 font-semibold">
                Rumah Nyaman, Cicilan Ringan,<br/>Wujudkan Masa Depan Keluarga
              </p>
              <p className="text-gray-600 mb-8">
                Temukan rumah impian Anda di Pematang Siantar dengan program KPR bersubsidi yang terjangkau. Proses mudah, cepat, dan terpercaya.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/map">
                  <Button size="lg" className="w-full sm:w-auto bg-[#003d82] hover:bg-[#002a5c] text-white">
                    Lihat Peta Perumahan
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto border-2 border-[#003d82] bg-transparent text-[#003d82] hover:bg-[#003d82]/5">
                    Pelajari Lebih Lanjut
                  </Button>
                </Link>
              </div>
            </div>
            {/* Image */}
            <div className="relative overflow-hidden flex justify-center items-center">
              <img
                src="/rumah.png"
                alt="Perumahan Modern"
                className="w-full max-w-sm sm:max-w-md md:max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-[#003d82]">Keuntungan KPR Bersubsidi BRI</h2>
            <p className="text-lg text-gray-600">
              Wujudkan rumah impian Anda dengan berbagai keuntungan eksklusif
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <Card className="p-8 hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-2 border-gray-200">
              <div className="w-16 h-16 bg-[#003d82] rounded-full flex items-center justify-center mb-6 mx-auto">
                <Home className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-[#003d82]">DP Ringan</h3>
              <p className="text-gray-600 text-center">
                Bantu wujudkan rumah pertama dengan DP yang ringan dan terjangkau untuk semua kalangan
              </p>
            </Card>

            {/* Benefit 2 */}
            <Card className="p-8 hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-2 border-gray-200">
              <div className="w-16 h-16 bg-[#003d82] rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-[#003d82]">Bunga Rendah</h3>
              <p className="text-gray-600 text-center">
                Ringan & terjangkau sesuai kemampuan Anda dengan suku bunga kompetitif dari BRI
              </p>
            </Card>

            {/* Benefit 3 */}
            <Card className="p-8 hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-2 border-gray-200">
              <div className="w-16 h-16 bg-[#003d82] rounded-full flex items-center justify-center mb-6 mx-auto">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-[#003d82]">Aman & Terpercaya</h3>
              <p className="text-gray-600 text-center">
                Proses mudah, transparan, dan terpercaya dengan dukungan bank terkemuka Indonesia
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#003d82] to-[#005db3] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-5xl md:text-6xl font-bold mb-2">
                <AnimatedCounter end={25} suffix="+" />
              </p>
              <p className="text-lg opacity-90">Perumahan Terdaftar</p>
            </div>
            <div>
              <p className="text-5xl md:text-6xl font-bold mb-2">
                <AnimatedCounter end={500} suffix="+" />
              </p>
              <p className="text-lg opacity-90">Unit Rumah Tersedia</p>
            </div>
            <div>
              <p className="text-5xl md:text-6xl font-bold mb-2">
                <AnimatedCounter end={1000} suffix="+" />
              </p>
              <p className="text-lg opacity-90">Pelanggan Puas</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex items-center justify-between">
            <div>
              <div className="inline-block bg-[#ff8c42] text-white px-4 py-2 rounded-lg font-semibold text-sm mb-4">
                PROSES MUDAH
              </div>
              <h2 className="text-4xl font-bold text-[#003d82]">Langkah Mendapatkan KPR</h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#ff8c42] text-white rounded-full flex items-center justify-center text-3xl font-bold mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#003d82]">Subsidi Pemerintah</h3>
              <p className="text-gray-600">
                Bantu wujudkan rumah pertama dengan dukungan subsidi dari pemerintah
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#ff8c42] text-white rounded-full flex items-center justify-center text-3xl font-bold mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#003d82]">Cicilan Tetap</h3>
              <p className="text-gray-600">
                Ringan & terjangkau sesuai kemampuan dengan cicilan yang tetap dan stabil
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#ff8c42] text-white rounded-full flex items-center justify-center text-3xl font-bold mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#003d82]">Proses Mudah</h3>
              <p className="text-gray-600">
                Persyaratan mudah, proses cepat, dan dukungan tim ahli BRI setiap langkah
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#003d82] to-[#005db3] text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff8c42]/10 rounded-full -mr-48 -mt-48"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Wujudkan Rumah Impian Anda</h2>
          <p className="text-lg opacity-95 mb-8">
            Dapatkan solusi KPR bersubsidi terbaik dari BRI untuk masa depan keluarga Anda
          </p>
          <Link href="/map">
            <Button size="lg" className="bg-[#ff8c42] hover:bg-[#ff7a1f] text-[#003d82] font-bold">
              Lihat Perumahan Tersedia
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#003d82] text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative w-8 h-8">
                  <Image
                    src="/logobri.png"
                    alt="Logo BRI"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-bold">KPR BRI</span>
              </div>
              <p className="text-sm opacity-90">
                Solusi KPR bersubsidi terpercaya untuk mewujudkan rumah impian keluarga Indonesia
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#ff8c42]">Navigasi</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>
                  <Link href="/map" className="hover:text-[#ff8c42] transition-colors">
                    Peta Perumahan
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-[#ff8c42] transition-colors">
                    Keuntungan
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="hover:text-[#ff8c42] transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#ff8c42]">Kontak</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>Telepon: (0813) 71901927</li>
                <li>Alamat: Pematang Siantar,<br/>Sumatera Utara</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-[#ff8c42]">Informasi</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>
                  <a href="#" className="hover:text-[#ff8c42] transition-colors">
                    Kebijakan Privasi
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#ff8c42] transition-colors">
                    Syarat & Ketentuan
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-center text-sm opacity-75">
            <p>&copy; 2025 KPR BRI Pematang Siantar. BRI adalah peserta penyelenggara LPS. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
