"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { simpanPerumahan } from "@/app/admin/actions"

type Region = { id: string; district: string; village: string | null; city: string }

export type NilaiAwal = Partial<{
  id: string
  name: string
  slug: string
  address: string
  region_id: string | null
  lat: number
  lng: number
  price_min: number | null
  price_max: number | null
  subsidi_units: number
  sold_subsidi_units: number
  commercial_units: number
  sold_commercial_units: number
  building_area: number | null
  land_area: number | null
  bedrooms: number | null
  bathrooms: number | null
  roof_type: string | null
  wall_type: string | null
  foundation_type: string | null
  status: "draft" | "published" | "archived"
  needs_review: boolean
}>

function Baris({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export default function HousingForm({
  awal,
  regions,
}: {
  awal: NilaiAwal
  regions: Region[]
}) {
  const [error, setError] = useState("")
  const [sukses, setSukses] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  const kirim = (formData: FormData) => {
    setError("")
    setSukses(false)
    start(async () => {
      const hasil = await simpanPerumahan(awal.id ?? null, formData)
      if (!hasil.ok) {
        setError(hasil.error)
        return
      }
      setSukses(true)
      if (!awal.id && hasil.id) router.push(`/admin/perumahan/${hasil.id}`)
      else router.refresh()
    })
  }

  return (
    <form action={kirim} className="space-y-8">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}
      {sukses && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-ok/25 bg-ok-50 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
          <p className="text-sm font-medium text-ok">
            Tersimpan. Perubahan tampil di halaman publik dalam beberapa saat.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
        <h2 className="font-semibold text-foreground">Identitas</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Baris label="Nama perumahan">
            <Input name="name" required defaultValue={awal.name ?? ""} maxLength={160} />
          </Baris>
          <Baris label="Slug" hint="Dipakai di URL. Huruf kecil, angka, tanda hubung.">
            <Input name="slug" required defaultValue={awal.slug ?? ""} pattern="[a-z0-9-]+" maxLength={80} />
          </Baris>
          <Baris label="Alamat (jalan saja)" hint="Kecamatan dan kelurahan diisi lewat kolom wilayah.">
            <Input name="address" defaultValue={awal.address ?? ""} maxLength={400} />
          </Baris>
          <Baris label="Wilayah">
            <select
              name="region_id"
              defaultValue={awal.region_id ?? ""}
              className="h-11 w-full rounded-2xl border border-input bg-white px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">— belum diisi —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.district}
                  {r.village ? ` · ${r.village}` : ""} ({r.city})
                </option>
              ))}
            </select>
          </Baris>
          <Baris label="Lintang (lat)" hint="Wilayah Indonesia: -11 sampai 6">
            <Input name="lat" required type="number" step="any" defaultValue={awal.lat ?? ""} />
          </Baris>
          <Baris label="Bujur (lng)" hint="Wilayah Indonesia: 95 sampai 141">
            <Input name="lng" required type="number" step="any" defaultValue={awal.lng ?? ""} />
          </Baris>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
        <h2 className="font-semibold text-foreground">Unit dan harga</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unit tersedia dihitung otomatis: (subsidi + komersial) − (terjual subsidi + terjual
          komersial). Kolomnya tidak bisa diisi manual.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Baris label="Unit subsidi">
            <Input name="subsidi_units" required type="number" min={0} defaultValue={awal.subsidi_units ?? 0} />
          </Baris>
          <Baris label="Subsidi terjual">
            <Input name="sold_subsidi_units" required type="number" min={0} defaultValue={awal.sold_subsidi_units ?? 0} />
          </Baris>
          <Baris label="Unit komersial">
            <Input name="commercial_units" required type="number" min={0} defaultValue={awal.commercial_units ?? 0} />
          </Baris>
          <Baris label="Komersial terjual">
            <Input name="sold_commercial_units" required type="number" min={0} defaultValue={awal.sold_commercial_units ?? 0} />
          </Baris>
          <Baris label="Harga minimum (Rp)">
            <Input name="price_min" type="number" min={0} step={1} defaultValue={awal.price_min ?? ""} />
          </Baris>
          <Baris label="Harga maksimum (Rp)">
            <Input name="price_max" type="number" min={0} step={1} defaultValue={awal.price_max ?? ""} />
          </Baris>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
        <h2 className="font-semibold text-foreground">Spesifikasi</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Baris label="Luas bangunan (m²)">
            <Input name="building_area" type="number" step="0.01" min={0} defaultValue={awal.building_area ?? ""} />
          </Baris>
          <Baris label="Luas tanah (m²)">
            <Input name="land_area" type="number" step="0.01" min={0} defaultValue={awal.land_area ?? ""} />
          </Baris>
          <Baris label="Kamar tidur">
            <Input name="bedrooms" type="number" min={0} max={99} defaultValue={awal.bedrooms ?? ""} />
          </Baris>
          <Baris label="Kamar mandi">
            <Input name="bathrooms" type="number" min={0} max={99} defaultValue={awal.bathrooms ?? ""} />
          </Baris>
          <Baris label="Jenis atap">
            <Input name="roof_type" defaultValue={awal.roof_type ?? ""} maxLength={200} />
          </Baris>
          <Baris label="Jenis dinding">
            <Input name="wall_type" defaultValue={awal.wall_type ?? ""} maxLength={200} />
          </Baris>
          <Baris label="Jenis pondasi">
            <Input name="foundation_type" defaultValue={awal.foundation_type ?? ""} maxLength={200} />
          </Baris>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-e2">
        <h2 className="font-semibold text-foreground">Status</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Baris label="Status publikasi" hint="Hanya 'terbit' yang terlihat pengunjung.">
            <select
              name="status"
              defaultValue={awal.status ?? "draft"}
              className="h-11 w-full rounded-2xl border border-input bg-white px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="draft">Draft</option>
              <option value="published">Terbit</option>
              <option value="archived">Arsip</option>
            </select>
          </Baris>
          <label className="flex items-start gap-3 self-end rounded-2xl border border-border bg-secondary p-4">
            <input
              type="checkbox"
              name="needs_review"
              defaultChecked={awal.needs_review ?? false}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              <span className="block text-sm font-semibold text-foreground">Perlu ditinjau</span>
              <span className="block text-xs text-muted-foreground">
                Tandai bila angka masih turunan atau kontak belum diverifikasi. Matikan setelah
                data dikonfirmasi tim BRI.
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  )
}
