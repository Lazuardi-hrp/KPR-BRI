"use client"

import { X, MapPin, Home, DollarSign, Phone, Mail, User, Check, Wifi } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card } from "@/components/ui/card"
import { ReactNode } from "react"

interface HousingPopupProps {
  housing: any
  onClose: () => void
}

export default function HousingPopup({ housing, onClose }: HousingPopupProps) {
  const availabilityPercent = Math.round(
    (housing.availableUnits / housing.totalUnits) * 100
  )

  const availabilityStatus =
    availabilityPercent > 50 ? "Tinggi" :
    availabilityPercent > 20 ? "Sedang" :
    "Rendah"

  const statusColor =
    availabilityPercent > 50 ? "text-green-600" :
    availabilityPercent > 20 ? "text-yellow-600" :
    "text-red-600"

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200" onClick={onClose} />

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">

        <Card className="relative overflow-hidden shadow-2xl">

          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-background/90 hover:bg-background 
                       rounded-full p-2 z-10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* HEADER IMAGE */}
          <div className="relative h-72 overflow-hidden">
            <img
              src={housing.image || "/placeholder.svg"}
              alt={housing.name}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            <div className="absolute bottom-4 left-6">
              <div className="bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className={`text-sm font-semibold ${statusColor}`}>
                  Ketersediaan: {availabilityStatus}
                </span>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="p-8 space-y-10">

            {/* TITLE */}
            <div className="border-b border-border pb-6">
              <h2 className="text-4xl font-bold mb-3">{housing.name}</h2>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                <span>{housing.description}</span>
              </div>

              <div className="mt-4 bg-blue-50 px-4 py-2 inline-block rounded-lg">
                <span className="text-sm font-semibold text-blue-700">
                  {availabilityPercent}% Tersedia
                </span>
              </div>
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard
                icon={<Home className="w-5 h-5 text-blue-600" />}
                label="Total Unit"
                color="blue"
                value={housing.totalUnits}
              />

              <InfoCard
                icon={<Check className="w-5 h-5 text-green-600" />}
                label="Tersedia"
                color="green"
                value={housing.availableUnits}
              />

              <InfoCard
                icon={<DollarSign className="w-5 h-5 text-amber-600" />}
                label="Harga"
                color="amber"
                value={housing.priceRange}
              />

              <InfoCard
                icon={<Wifi className="w-5 h-5 text-purple-600" />}
                label="Status"
                color="purple"
                value={availabilityStatus}
              />
            </div>

            {/* FACILITIES */}
            <div className="border-y border-border py-6">
              <h3 className="font-bold text-lg mb-4">Fasilitas Unggulan</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {housing.facilities.slice(0, 9).map((item: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-muted/50 hover:bg-muted 
                               transition p-3 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>

              {housing.facilities.length > 9 && (
                <p className="text-sm text-muted-foreground mt-3">
                  +{housing.facilities.length - 9} fasilitas lainnya
                </p>
              )}
            </div>

            {/* CONTACT INFO */}
            <div> 
              <h3 className="font-bold text-lg mb-5">Hubungi Agen Penjualan</h3>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 
                              p-6 rounded-xl border border-slate-200 space-y-4">

                <ContactItem
                  icon={<User className="w-5 h-5 text-primary" />}
                  label="Agen Penjualan"
                  value={housing.contactPerson}
                />

                <ContactItem
                  icon={<Phone className="w-5 h-5 text-primary" />}
                  label="Telepon"
                  value={
                    <a href={`tel:${housing.phone}`} className="text-primary font-bold hover:underline">
                      {housing.phone}
                    </a>
                  }
                />

                <ContactItem
                  icon={<Mail className="w-5 h-5 text-primary" />}
                  label="Email"
                  value={
                    <a href={`mailto:${housing.email}`} className="text-primary font-bold hover:underline break-all">
                      {housing.email}
                    </a>
                  }
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 pt-6 border-t border-border">
              <Button className="flex-1 h-12 text-base font-semibold">
                Hubungi Sekarang
              </Button>

              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-12 text-base font-semibold"
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


/* ---------------------------------------
   SMALL COMPONENTS
--------------------------------------- */

type InfoCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  color: string
}

export function InfoCard({ icon, label, value, color }: InfoCardProps) {
  return (
    <div className="p-5 rounded-xl border bg-white shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-muted">{icon}</div>
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <p className="font-bold text-xl md:text-3xl">{value}</p>
    </div>
  )
}

type ContactItemProps = {
  icon: ReactNode
  label: string
  value: ReactNode
}

export function ContactItem({ icon, label, value }: ContactItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-lg bg-primary/10">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="text-lg font-bold break-all">{value}</div>
      </div>
    </div>
  )
}
