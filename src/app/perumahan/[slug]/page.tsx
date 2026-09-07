import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ArrowLeft, MapPin, Phone, User } from "lucide-react"

import { getHousingBySlug, getPublishedHousings } from "@/lib/queries/housings"
import { getKonfigKPR } from "@/lib/queries/kpr"
import { getKontakWhatsApp } from "@/lib/queries/whatsapp"
import { Coord } from "@/components/coord"
import { JejakTampilan } from "@/components/jejak-tampilan"
import KontakDock from "@/components/kontak-dock"
import KprPanel from "@/components/kpr-panel"
import PropertyGallery from "@/components/property-gallery"
import TrustPanel from "@/components/trust-panel"
import WhatsAppCta from "@/components/whatsapp-cta"
import { tautanProperti } from "@/lib/whatsapp"

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

  // Bunga yang berlaku dibaca sekali di sini dan diturunkan ke panel, sehingga
  // sidebar ini dan /simulasi tidak mungkin menampilkan dua angka berbeda
  // untuk perumahan yang sama.
  //
  // Nomor pusat dibaca berdampingan dengannya dan hanya terpakai bila
  // perumahan ini belum punya kontak pemasaran — beberapa baris hasil migrasi
  // memang belum. Halaman tanpa satu pun jalan menghubungi adalah halaman yang
  // menghentikan calon pembeli tepat setelah ia yakin.
  const [konfig, waPusat] = await Promise.all([getKonfigKPR(), getKontakWhatsApp()])
  const nomorKontak = h.phone || waPusat?.nomor || null

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
      {/*
        Halaman ini SSG + ISR (revalidate = 300 di atas): pada cache hit ia
        tidak pernah menyentuh server, jadi tampilannya mustahil dicatat dari
        RSC. Suar dari peramban adalah satu-satunya tempat yang tersisa.
        Merender null, tidak menggeser tata letak apa pun.
      */}
      <JejakTampilan housingId={h.id} />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke peta
        </Link>

        <header id="kepala-perumahan" className="mt-6">
          <Coord lat={h.lat} lng={h.lng} />
          <h1 className="font-display mt-3 text-[length:var(--fs-display-m)] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground">
            {h.name}
          </h1>
          <p className="mt-3 flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {h.description}
          </p>
        </header>

        {/* Status verifikasi mendahului foto dan harga: itu yang menentukan
            seberapa jauh angka di bawahnya pantas dipercaya. */}
        <div className="mt-6">
          <TrustPanel housing={h} />
        </div>

        {/* Galeri, bukan satu foto. Sebelumnya halaman ini hanya menampilkan
            sampul, jadi foto kedua dan seterusnya yang dikelola admin tidak
            pernah sampai ke calon pembeli — padahal popup peta sudah
            menampilkan semuanya. `gallery` sudah urut sebagaimana disusun
            admin di dashboard: sampul di depan, sisanya menurut sort_order. */}
        {h.gallery && h.gallery.length > 0 && (
          <PropertyGallery images={h.gallery} title={h.name} />
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

            {(h.contactPerson || h.phone || nomorKontak) && (
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

                  {/*
                    Pertanyaan tentang PERUMAHAN INI, bukan tentang angsuran —
                    itu niat yang berbeda dan ada tombolnya sendiri di panel
                    kalkulator. Pesannya membawa nama, harga, dan tautan
                    halaman, sehingga petugas tidak perlu bertanya "yang mana"
                    sebelum bisa menjawab apa pun.
                  */}
                  {nomorKontak && (
                    <div className="pt-2">
                      <WhatsAppCta
                        phone={nomorKontak}
                        niat="properti"
                        housingId={h.id}
                        className="w-full"
                        konteks={{
                          perumahan: h.name,
                          harga: h.priceMin,
                          tautan: tautanProperti(h.slug),
                        }}
                      />
                      {!h.phone && waPusat && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          Kontak pemasaran perumahan ini belum tercatat, jadi pesan Anda
                          akan diterima {waPusat.label}
                          {waPusat.jam ? ` (${waPusat.jam})` : ""}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside id="ajukan" className="scroll-mt-8 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-e3">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">
                Tertarik dengan perumahan ini?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Hitung perkiraan angsuran, lalu tinggalkan nomor Anda — petugas
                akan menghubungi.
              </p>
              <div className="mt-5">
                <KprPanel
                  housingId={h.id}
                  housingName={h.name}
                  priceMin={h.priceMin ?? null}
                  housingSlug={h.slug}
                  phone={h.phone}
                  waPusat={waPusat?.nomor ?? null}
                  konfig={konfig.skema}
                  ditinjauPada={konfig.ditinjauPada}
                  turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                />
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

      {/*
        Hanya di bawah `lg`. Di atas itu sidebar di sebelah kanan sudah
        menempel sepanjang halaman dan dok ini akan menjadi tumpukan kedua
        untuk pekerjaan yang sama.
      */}
      <KontakDock
        housingId={h.id}
        housingName={h.name}
        slug={h.slug}
        harga={h.priceMin ?? null}
        phone={h.phone}
        waPusat={waPusat?.nomor ?? null}
        after="#kepala-perumahan"
        hideOver="#ajukan"
      />
    </main>
  )
}
