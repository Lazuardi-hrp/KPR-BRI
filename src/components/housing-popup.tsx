"use client"

import { X, MapPin, Phone, Mail, User } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card } from "@/components/ui/card"
import ImageSlideshow from "./image-slideshow"

type Housing = {
  name: string
  description: string
  image?: string
  images?: string[]  
  availableUnits: number
  totalUnits: number

  roofType?: string
  wallType?: string
  foundationType?: string

  subsidiUnits?: number
  soldSubsidiUnits?: number
  commercialUnits?: number
  soldCommercialUnits?: number

  contactPerson: string
  phone: string
  email: string
}

type HousingPopupProps = {
  housing: Housing
  onClose: () => void
}

export default function HousingPopup({ housing, onClose }: HousingPopupProps) {
  const availabilityPercent = Math.round((housing.availableUnits / housing.totalUnits) * 100)
  const availabilityStatus =
    availabilityPercent > 50 ? "Tinggi" : availabilityPercent > 20 ? "Sedang" : "Rendah"

  const statusColor =
    availabilityPercent > 50
      ? "text-green-600"
      : availabilityPercent > 20
      ? "text-yellow-600"
      : "text-red-600"

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-0 pointer-events-none">
        <div className="w-full sm:w-auto sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 pointer-events-auto">
          <Card className="overflow-hidden shadow-2xl rounded-t-2xl sm:rounded-2xl">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 bg-background/90 hover:bg-background rounded-full p-2 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Image Slideshow */}
            <ImageSlideshow
              images={
                (housing.images?.length ? housing.images : [housing.image])
                  .filter(Boolean) as string[]
              }
              title={housing.name}
              availabilityPercent={availabilityPercent}
              availabilityStatus={availabilityStatus}
              statusColor={statusColor}
            />

            {/* Content */}
            <div className="p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-5 md:space-y-6">
              {/* Title & Description */}
              <div className="border-b border-border pb-3 sm:pb-4 md:pb-5">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">truncate{housing.name}</h2>
                <div className="flex items-start gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm">{housing.description}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="bg-blue-50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                    <span className="text-xs sm:text-sm font-semibold text-blue-700">
                      {availabilityPercent}% Tersedia
                    </span>
                  </div>
                </div>
              </div>

              {/* Spesifikasi Teknis Section */}
              <div className="border-b border-border pb-3 sm:pb-4 md:pb-5">
                <h3 className="font-bold text-sm sm:text-base md:text-lg mb-3">Spesifikasi Teknis</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-slate-50 p-2.5 sm:p-3 md:p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Atap</p>
                    <p className="text-xs sm:text-sm font-bold truncate">{housing.roofType || "Tidak ada data"}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 sm:p-3 md:p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Dinding</p>
                    <p className="text-xs sm:text-sm font-bold truncate">{housing.wallType || "Tidak ada data"}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 sm:p-3 md:p-4 rounded-lg sm:col-span-2">
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Lantai & Pondasi</p>
                    <p className="text-xs sm:text-sm font-bold truncate">
                      {housing.foundationType || "Tidak ada data"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Rumah Section */}
              <div>
                <h3 className="font-bold text-sm sm:text-base md:text-lg mb-3">Status Rumah</h3>
                <div className="space-y-2 sm:space-y-3">
                  {/* Subsidi Row */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-blue-500 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Subsidi</p>
                      <p className="text-xs text-blue-600 truncate">Unit tersedia</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-900">
                        {housing.subsidiUnits || "62"}
                      </p>
                    </div>
                  </div>

                  {/* Terjual Subsidi Row */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-gradient-to-r from-green-50 to-transparent border-l-4 border-green-500 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Terjual Subsidi</p>
                      <p className="text-xs text-green-600 truncate">Unit terjual</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-lg sm:text-2xl md:text-3xl font-bold text-green-900">
                        {housing.soldSubsidiUnits || "63"}
                      </p>
                    </div>
                  </div>

                  {/* Komersil Row */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-gradient-to-r from-amber-50 to-transparent border-l-4 border-amber-500 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Komersil</p>
                      <p className="text-xs text-amber-600 truncate">Unit tersedia</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-lg sm:text-2xl md:text-3xl font-bold text-amber-900">
                        {housing.commercialUnits || "0"}
                      </p>
                    </div>
                  </div>

                  {/* Terjual Komersil Row */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-gradient-to-r from-purple-50 to-transparent border-l-4 border-purple-500 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Terjual Komersil</p>
                      <p className="text-xs text-purple-600 truncate">Unit terjual</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-lg sm:text-2xl md:text-3xl font-bold text-purple-900">
                        {housing.soldCommercialUnits || "0"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="font-bold text-sm sm:text-base md:text-lg mb-2.5 sm:mb-3">Hubungi Agen Penjualan</h3>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-slate-200 space-y-2 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Agen Penjualan</p>
                      <p className="text-xs sm:text-sm font-bold truncate">{housing.contactPerson}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Telepon</p>
                      <a
                        href={`tel:${housing.phone}`}
                        className="text-xs sm:text-sm font-bold text-primary hover:underline break-all"
                      >
                        {housing.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${housing.email}`}
                        className="text-xs font-bold text-primary hover:underline break-all"
                      >
                        {housing.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4 md:pt-5 border-t border-border">
                <Button className="flex-1 h-9 sm:h-10 text-xs sm:text-sm font-semibold">Hubungi Sekarang</Button>
                <Button
                  variant="secondary"
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm font-semibold bg-transparent"
                  onClick={onClose}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>    
    </>
  )
}
