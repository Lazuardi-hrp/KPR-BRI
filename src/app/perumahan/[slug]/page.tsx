import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ArrowLeft, MapPin, Phone, User } from "lucide-react"

import { getHousingBySlug, getPublishedHousings } from "@/lib/queries/housings"
import { blurFor } from "@/lib/image-blur"
import { Coord } from "@/components/coord"
import LeadForm from "@/components/lead-form"

export const revalidate = 300

export async function generateStaticParams() {
  const rows = await getPublishedHousings()
  return rows.filter((h) => h.slug).map((h) => ({ slug: h.slug! }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const h = await getHousingBySlug(slug)
  if (!h) return { title: "Perumahan tidak ditemukan" }
  return {
    title: `${h.name} — KPR Bersubsidi BRI Pematang Siantar`,
    description: `${h.name}. ${h.description}. ${h.availableUnits} unit tersedia.`,
  }
}

export default async function DetailPerumahan({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const h = await getHousingBySlug(slug)
  if (!h) notFound()

  const persen = h.availabilityPercent
  const spesifikasi = [
    { label: "Luas bangunan", value: h.buildingArea },
    { label: "Luas tanah", value: h.landArea },
    { label: "Kamar tidur", value: h.bedrooms?.toString() },
    { label: "Kamar mandi", value: h.bathrooms?.toString() },
    { label: "Atap", value: h.roofType },
    { label: "Dinding", value: h.wallType },
    { label: "Pondasi", value: h.foundationType },
  ].filter((s) => s.value)

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke peta
        </Link>

        <header className="mt-6">
          <Coord lat={h.lat} lng={h.lng} />
          <h1 className="font-display mt-3 text-[length:var(--fs-display-m)] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground">
            {h.name}
          </h1>
          <p className="mt-3 flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {h.description}
          </p>
        </header>

        {h.image && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-border">
            <Image
              src={h.image}
              alt={h.name}
              width={1200}
              height={900}
              priority
              placeholder={blurFor(h.image) ? "blur" : "empty"}
              blurDataURL={blurFor(h.image)}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-border bg-secondary p-6">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-coord text-muted-foreground">Harga mulai</p>
                  <p className="numeric mt-1.5 text-lg font-extrabold text-foreground">
                    {h.priceRange}
                  </p>
                </div>
                <div>
                  <p className="text-coord text-muted-foreground">Unit tersedia</p>
                  <p className="numeric mt-1.5 text-lg font-extrabold text-foreground">
                    {h.availableUnits}
                    <span className="text-muted-foreground"> / {h.totalUnits ?? 0}</span>
                  </p>
                </div>
                <div>
                  <p className="text-coord text-muted-foreground">Ketersediaan</p>
                  <p className="numeric mt-1.5 text-lg font-extrabold text-foreground">
                    {persen === null || persen === undefined ? (
                      <span className="text-base font-semibold text-muted-foreground">
                        Data belum lengkap
                      </span>
                    ) : (
                      `${persen}%`
                    )}
                  </p>
                </div>
              </div>
            </section>

            {spesifikasi.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
                  Spesifikasi
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {spesifikasi.map((s) => (
                    <div key={s.label}>
                      <dt className="text-coord text-muted-foreground">{s.label}</dt>
                      <dd className="mt-1 font-semibold text-foreground">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {(h.contactPerson || h.phone) && (
              <section>
                <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
                  Kontak pemasaran
                </h2>
                <div className="mt-4 space-y-2">
                  {h.contactPerson && (
                    <p className="flex items-center gap-2.5 text-foreground">
                      <User className="h-4 w-4 text-muted-foreground" /> {h.contactPerson}
                    </p>
                  )}
                  {h.phone && (
                    <p className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${h.phone}`} className="numeric text-primary hover:underline">
                        {h.phone}
                      </a>
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-e3">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
                Tertarik dengan perumahan ini?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tinggalkan nama dan nomor telepon, petugas akan menghubungi Anda.
              </p>
              <div className="mt-5">
                <LeadForm housingId={h.id} housingName={h.name} />
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                <Link href="/kebijakan-privasi" className="underline hover:text-foreground">
                  Kebijakan Privasi
                </Link>
                {" · "}
                <Link href="/syarat-ketentuan" className="underline hover:text-foreground">
                  Syarat &amp; Ketentuan
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
