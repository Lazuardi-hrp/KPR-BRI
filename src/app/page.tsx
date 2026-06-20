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
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#003d82]/5 to-transparent shadow-sm border-b backdrop-blur-sm border-[#003d82]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">

            {/* LEFT: Logo + Nama Website */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-20 sm:w-32 h-20 sm:h-32">
                <Image
                  src="/logokpr.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-16 sm:w-22 h-16 sm:h-22">
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
      <section className="relative overflow-hidden py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#003d82]/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Text */}
            <div>
              <div className="inline-block bg-[#003d82] text-white px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm mb-3 sm:mb-4">
                MILIKI RUMAH IMPIAN
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-pretty mb-3 sm:mb-4 text-[#003d82]">
                KPR Bersubsidi BRI
              </h1>
              <p className="text-base sm:text-lg text-gray-700 mb-2 font-semibold">
                Rumah Nyaman, Cicilan Ringan,<br />Wujudkan Masa Depan Keluarga
              </p>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                Temukan rumah impian Anda di Pematang Siantar dengan program KPR bersubsidi yang terjangkau. Proses mudah, cepat, dan terpercaya.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/map" className="w-full sm:w-auto">
                  <Button size="sm" className="w-full bg-[#003d82] hover:bg-[#002a5c] text-white text-sm sm:text-base">
                    Lihat Peta Perumahan
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </Link>
                <Link href="#features" className="w-full sm:w-auto">
                  <Button
                    size="sm"
                    className="w-full border-2 border-[#003d82] bg-transparent text-[#003d82] hover:bg-[#003d82]/5 text-sm sm:text-base">
                    Pelajari Lebih Lanjut
                  </Button>
                </Link>
              </div>
            </div>
            {/* Image */}
            <div className="relative overflow-hidden flex justify-center items-center mt-8 md:mt-0">
              <img
                src="/rumah.png"
                alt="Perumahan Modern"
                className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-[#003d82]">Keuntungan KPR Bersubsidi BRI</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Wujudkan rumah impian Anda dengan berbagai keuntungan eksklusif
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Benefit 1 */}
            <Card className="p-6 sm:p-8 hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-2 border-gray-200">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#003d82] rounded-full flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                <Home className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-center text-[#003d82]">DP Ringan</h3>
              <p className="text-sm sm:text-base text-gray-600 text-center">
                Bantu wujudkan rumah pertama dengan DP yang ringan dan terjangkau untuk semua kalangan
              </p>
            </Card>

            {/* Benefit 2 */}
            <Card className="p-6 sm:p-8 hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-2 border-gray-200">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#003d82] rounded-full flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-center text-[#003d82]">Bunga Rendah</h3>
              <p className="text-sm sm:text-base text-gray-600 text-center">
                Ringan & terjangkau sesuai kemampuan Anda dengan suku bunga kompetitif dari BRI
              </p>
            </Card>

            {/* Benefit 3 */}
            <Card className="p-6 sm:p-8 hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-2 border-gray-200 sm:col-span-2 md:col-span-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#003d82] rounded-full flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-center text-[#003d82]">Aman & Terpercaya</h3>
              <p className="text-sm sm:text-base text-gray-600 text-center">
                Proses mudah, transparan, dan terpercaya dengan dukungan bank terkemuka Indonesia
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#003d82] to-[#005db3] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2">
                <AnimatedCounter end={25} suffix="+" />
              </p>
              <p className="text-sm sm:text-base md:text-lg opacity-90">Perumahan Terdaftar</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2">
                <AnimatedCounter end={500} suffix="+" />
              </p>
              <p className="text-sm sm:text-base md:text-lg opacity-90">Unit Rumah Tersedia</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2">
                <AnimatedCounter end={1000} suffix="+" />
              </p>
              <p className="text-sm sm:text-base md:text-lg opacity-90">Pelanggan Puas</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 sm:mb-12 md:mb-16 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-block bg-[#ff8c42] text-white px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm mb-3 sm:mb-4">
                PROSES MUDAH
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#003d82]">Langkah Mendapatkan KPR</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#ff8c42] text-white rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-[#003d82]">Subsidi Pemerintah</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Bantu wujudkan rumah pertama dengan dukungan subsidi dari pemerintah
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#ff8c42] text-white rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-[#003d82]">Cicilan Tetap</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Ringan & terjangkau sesuai kemampuan dengan cicilan yang tetap dan stabil
              </p>
            </div>

            <div className="flex flex-col items-center text-center sm:col-span-2 md:col-span-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#ff8c42] text-white rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-[#003d82]">Proses Mudah</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Persyaratan mudah, proses cepat, dan dukungan tim ahli BRI setiap langkah
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#003d82] to-[#005db3] text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-96 sm:h-96 bg-[#ff8c42]/10 rounded-full -mr-24 sm:-mr-48 -mt-24 sm:-mt-48"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">Wujudkan Rumah Impian Anda</h2>
          <p className="text-sm sm:text-base md:text-lg opacity-95 mb-6 sm:mb-8">
            Dapatkan solusi KPR bersubsidi terbaik dari BRI untuk masa depan keluarga Anda
          </p>
          <Link href="/map" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto bg-[#ff8c42] hover:bg-[#ff7a1f] text-[#003d82] font-bold text-sm sm:text-base">
              Lihat Perumahan Tersedia
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#003d82] text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
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
                <span className="font-bold text-sm sm:text-base">KPR BRI</span>
              </div>
              <p className="text-xs sm:text-sm opacity-90">
                Solusi KPR bersubsidi terpercaya untuk mewujudkan rumah impian keluarga Indonesia
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-[#ff8c42] text-sm sm:text-base">Navigasi</h4>
              <ul className="space-y-2 text-xs sm:text-sm opacity-90">
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
              <h4 className="font-semibold mb-3 sm:mb-4 text-[#ff8c42] text-sm sm:text-base">Kontak</h4>
              <ul className="space-y-2 text-xs sm:text-sm opacity-90">
                <li>Telepon: (0813) 71901927</li>
                <li>Alamat: Pematang Siantar,<br />Sumatera Utara</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-[#ff8c42] text-sm sm:text-base">Informasi</h4>
              <ul className="space-y-2 text-xs sm:text-sm opacity-90">
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
          <div className="border-t border-white/20 pt-6 sm:pt-8 text-center text-xs sm:text-sm opacity-75">
            <p>&copy; 2025 KPR BRI Pematang Siantar. BRI adalah peserta penyelenggara LPS. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
