"use client"

import { X, MapPin, Home, DollarSign, Phone, Mail, User, Check, Wifi } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card } from "@/components/ui/card"

/**
 * Definisi Interface untuk Data Housing
 * Anda perlu memastikan objek housing yang Anda passing sesuai dengan struktur ini.
 */
interface HousingData {
  name: string;
  image?: string; // Tanda '?' menunjukkan properti opsional
  description: string;
  address?: string; // Asumsi: address bisa dipisahkan dari description
  totalUnits: number;
  availableUnits: number;
  priceRange: string;
  facilities: string[];
  contactPerson?: string;
  phone?: string;
  email?: string;
}

interface HousingPopupProps {
  housing: HousingData | null; // Menerima HousingData atau null
  onClose: () => void;
}

export default function HousingPopup({ housing, onClose }: HousingPopupProps) {
  // 1. Penanganan data kosong/null di awal
  if (!housing) {
    return null; 
  }

  // Perhitungan Ketersediaan
  const availableUnits = housing.availableUnits || 0;
  const totalUnits = housing.totalUnits || 0;
  const facilities = housing.facilities || [];

  const availabilityPercent = totalUnits > 0 
    ? Math.round((availableUnits / totalUnits) * 100)
    : 0;

  const availabilityStatus = availabilityPercent > 50 
    ? "Tinggi" 
    : availabilityPercent > 20 
      ? "Sedang" 
      : "Rendah";
      
  const statusColor =
    availabilityPercent > 50 
      ? "text-green-600" 
      : availabilityPercent > 20 
        ? "text-yellow-600" 
        : "text-red-600"

  // Fallback untuk properti opsional
  const displayAddress = housing.address || housing.description || "Alamat tidak tersedia";
  const displayImage = housing.image || "/placeholder.svg";
  const contactPerson = housing.contactPerson || "Tidak Tersedia";
  const phone = housing.phone || "";
  const email = housing.email || "";

  return (
    <>
      {/* Backdrop dengan animasi */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-full mx-4 sm:max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 px-0"
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="housing-popup-title"
      >
        <Card className="overflow-hidden shadow-2xl">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 bg-background/90 hover:bg-background rounded-full p-2 transition-colors"
            aria-label="Tutup jendela" 
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="relative h-48 sm:h-72 overflow-hidden">
            <img 
              src={displayImage} 
              alt={housing.name} 
              className="w-full h-full object-cover" 
              onError={(e) => { 
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg"; 
                target.className += " bg-gray-200";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6">
              <div className="bg-background/95 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg w-fit">
                <span className={`text-xs sm:text-sm font-semibold ${statusColor}`}>
                  Ketersediaan: {availabilityStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            {/* Title & Address */}
            <div className="border-b border-border pb-4 sm:pb-6">
              <h2 id="housing-popup-title" className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3">
                {housing.name}
              </h2>
              <div className="flex items-start gap-2 text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">{displayAddress}</span>
              </div>
              <div className="flex gap-2 mt-3 sm:mt-4">
                <div className="bg-blue-50 px-3 sm:px-4 py-2 rounded-lg">
                  <span className="text-xs sm:text-sm font-semibold text-blue-700">
                    {availabilityPercent}% Tersedia ({availableUnits}/{totalUnits})
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 sm:p-5 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-blue-500/20 p-1.5 sm:p-2 rounded-lg">
                    <Home className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <span className="font-semibold text-xs text-blue-700">Total Unit</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900">{totalUnits}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-3 sm:p-5 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-green-500/20 p-1.5 sm:p-2 rounded-lg">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-xs text-green-700">Tersedia</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-green-900">{availableUnits}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-3 sm:p-5 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-amber-500/20 p-1.5 sm:p-2 rounded-lg">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <span className="font-semibold text-xs text-amber-700">Harga</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-amber-900">{housing.priceRange || "N/A"}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-3 sm:p-5 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="bg-purple-500/20 p-1.5 sm:p-2 rounded-lg">
                    <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <span className="font-semibold text-xs text-purple-700">Status</span>
                </div>
                <p className="text-sm sm:text-lg font-bold text-purple-900 capitalize">{availabilityStatus}</p>
              </div>
            </div>

            {/* Facilities Section */}
            <div className="border-y border-border py-4 sm:py-6">
              <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Fasilitas Unggulan</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {facilities.slice(0, 9).map((facility, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 sm:gap-3 bg-muted/50 hover:bg-muted transition-colors p-2 sm:p-3 rounded-lg"
                  >
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">{facility}</span>
                  </div>
                ))}
                {facilities.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 md:col-span-3">Tidak ada fasilitas yang terdaftar.</p>
                )}
              </div>
              {facilities.length > 9 && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3">
                  +{facilities.length - 9} fasilitas lainnya
                </p>
              )}
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-5">Hubungi Agen Penjualan</h3>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 rounded-xl border border-slate-200 space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Agen Penjualan</p>
                    <p className="text-sm sm:text-lg font-bold truncate">{contactPerson}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Telepon</p>
                    {phone ? (
                        <a
                            href={`tel:${phone}`}
                            className="text-sm sm:text-lg font-bold text-primary hover:underline"
                        >
                            {phone}
                        </a>
                    ) : (
                        <p className="text-sm sm:text-lg font-bold text-gray-500">Tidak Tersedia</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
                    {email ? (
                        <a
                            href={`mailto:${email}`}
                            className="text-xs sm:text-sm font-bold text-primary hover:underline break-all"
                        >
                            {email}
                        </a>
                    ) : (
                        <p className="text-sm font-bold text-gray-500">Tidak Tersedia</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-border">
              <Button 
                asChild
                className="flex-1 h-10 sm:h-12 text-sm sm:text-base font-semibold"
                disabled={!phone}
              >
                  <a href={phone ? `tel:${phone}` : "#"}>Hubungi Sekarang</a>
              </Button>
              <Button
                variant="secondary"
                className="flex-1 h-10 sm:h-12 text-sm sm:text-base font-semibold bg-transparent"
                onClick={onClose}
              >
                Tutup
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}