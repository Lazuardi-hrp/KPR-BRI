import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import HousingForm from "@/components/admin/housing-form"
import ContactForm from "@/components/admin/contact-form"
import ImageManager from "@/components/admin/image-manager"
import { getPerumahanUntukEdit } from "@/lib/queries/admin"
import type { FotoPerumahan } from "@/lib/schemas/image"

export const dynamic = "force-dynamic"

export default async function EditPerumahan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPerumahanUntukEdit(id)
  if (!data) notFound()

  const { housing: h, kontak, gambar, regions } = data
  const utama = kontak.find((k) => k.is_primary) ?? kontak[0]

  return (
    <div className="space-y-6">
      <Link
        href="/admin/perumahan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          {h.name}
        </h1>
        <Link
          href={`/perumahan/${h.slug}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Lihat halaman publik →
        </Link>
      </div>

      <HousingForm
        awal={{
          id: h.id,
          name: h.name,
          slug: h.slug,
          address: h.address,
          region_id: h.region_id,
          lat: h.lat,
          lng: h.lng,
          price_min: h.price_min,
          price_max: h.price_max,
          subsidi_units: h.subsidi_units,
          sold_subsidi_units: h.sold_subsidi_units,
          commercial_units: h.commercial_units,
          sold_commercial_units: h.sold_commercial_units,
          building_area: h.building_area,
          land_area: h.land_area,
          bedrooms: h.bedrooms,
          bathrooms: h.bathrooms,
          roof_type: h.roof_type,
          wall_type: h.wall_type,
          foundation_type: h.foundation_type,
          status: h.status,
          needs_review: h.needs_review,
        }}
        regions={regions}
      />

      <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
        <h2 className="font-semibold text-foreground">Kontak pemasaran</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ini satu-satunya jalur calon pembeli menghubungi perumahan. Email pada data lama
          adalah domain fiktif dan sengaja dikosongkan saat migrasi.
        </p>
        <div className="mt-5">
          <ContactForm
            housingId={h.id}
            awal={{
              name: utama?.name ?? "",
              phone: utama?.phone ?? "",
              email: utama?.email ?? "",
              role_label: utama?.role_label ?? "Marketing",
            }}
          />
        </div>
      </section>

      <ImageManager
        housingId={h.id}
        housingName={h.name}
        status={h.status}
        awal={gambar as FotoPerumahan[]}
      />
    </div>
  )
}
