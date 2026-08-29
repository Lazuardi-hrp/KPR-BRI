"use server"

import { revalidatePath, updateTag } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getSesiStaf } from "@/lib/auth"
import { HousingSchema, ContactSchema } from "@/lib/schemas/housing"

export type Hasil = { ok: true; id?: string } | { ok: false; error: string }

/**
 * Membatalkan cache pembacaan publik.
 *
 * updateTag (bukan revalidateTag) karena dipanggil dari Server Action:
 * ia memberi read-your-writes, sehingga admin langsung melihat hasil
 * simpanannya alih-alih halaman ISR yang basi.
 */
function segarkan() {
  updateTag("housings")
  revalidatePath("/")
  revalidatePath("/map")
}

/**
 * Menerjemahkan galat Postgres menjadi bahasa Indonesia yang bisa ditindaklanjuti.
 * Detail internal (nama constraint, potongan SQL) tidak pernah sampai ke pengguna.
 */
function pesanGalat(e: { code?: string; message?: string }): string {
  const m = e.message ?? ""
  if (m.includes("housings_units_ck")) return "Jumlah unit terjual melebihi total unit."
  if (m.includes("housings_published_ck"))
    return "Perumahan berstatus terbit wajib punya harga minimum dan tanggal terbit."
  if (m.includes("housings_lat_ck") || m.includes("housings_lng_ck"))
    return "Koordinat berada di luar wilayah Indonesia. Periksa lintang dan bujur."
  if (m.includes("housings_slug_key")) return "Slug sudah dipakai perumahan lain."
  if (m.includes("housings_price_ck")) return "Harga maksimum lebih kecil dari harga minimum."
  if (e.code === "42501" || m.includes("permission denied") || m.includes("row-level security"))
    return "Anda tidak berhak mengubah data ini."
  return "Gagal menyimpan. Periksa isian lalu coba lagi."
}

async function stafAtauGagal() {
  const sesi = await getSesiStaf()
  if (!sesi) return null
  return sesi
}

// ─────────────────────────── Perumahan ───────────────────────────

export async function simpanPerumahan(id: string | null, formData: FormData): Promise<Hasil> {
  const sesi = await stafAtauGagal()
  if (!sesi) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }

  const parsed = HousingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian tidak valid." }
  }
  const v = parsed.data

  const supabase = await createClient()
  const baris = {
    name: v.name,
    slug: v.slug,
    address: v.address,
    region_id: v.region_id ?? null,
    developer_id: v.developer_id ?? null,
    lat: v.lat,
    lng: v.lng,
    price_min: v.price_min ?? null,
    price_max: v.price_max ?? null,
    subsidi_units: v.subsidi_units,
    sold_subsidi_units: v.sold_subsidi_units,
    commercial_units: v.commercial_units,
    sold_commercial_units: v.sold_commercial_units,
    building_area: v.building_area ?? null,
    land_area: v.land_area ?? null,
    bedrooms: v.bedrooms ?? null,
    bathrooms: v.bathrooms ?? null,
    roof_type: v.roof_type ?? null,
    wall_type: v.wall_type ?? null,
    foundation_type: v.foundation_type ?? null,
    status: v.status,
    needs_review: v.needs_review,
    updated_by: sesi.userId,
    // published_at wajib terisi saat status published (housings_published_ck).
    ...(v.status === "published" ? { published_at: new Date().toISOString() } : {}),
  }

  if (id) {
    const { error } = await supabase.from("housings").update(baris).eq("id", id)
    if (error) return { ok: false, error: pesanGalat(error) }
    segarkan()
    return { ok: true, id }
  }

  const { data, error } = await supabase
    .from("housings")
    .insert({ ...baris, created_by: sesi.userId })
    .select("id")
    .single()
  if (error) return { ok: false, error: pesanGalat(error) }
  segarkan()
  return { ok: true, id: data.id }
}

export async function ubahStatusPerumahan(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<Hasil> {
  const sesi = await stafAtauGagal()
  if (!sesi) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }

  const supabase = await createClient()

  if (status === "published") {
    // Menerbitkan berarti menampilkannya ke calon pembeli. Sebelum itu, data
    // wajibnya harus benar-benar ada — foto sampul termasuk, karena kartu
    // perumahan tanpa foto tampil rusak di halaman utama.
    const { data: h } = await supabase
      .from("housings")
      .select("price_min, subsidi_units, commercial_units")
      .eq("id", id)
      .maybeSingle()
    if (!h) return { ok: false, error: "Perumahan tidak ditemukan." }
    if (h.price_min == null) return { ok: false, error: "Belum bisa terbit: harga minimum kosong." }
    if ((h.subsidi_units ?? 0) + (h.commercial_units ?? 0) === 0)
      return { ok: false, error: "Belum bisa terbit: jumlah unit masih nol." }

    const { count } = await supabase
      .from("housing_images")
      .select("id", { count: "exact", head: true })
      .eq("housing_id", id)
      .eq("is_cover", true)
    if (!count) return { ok: false, error: "Belum bisa terbit: foto sampul belum ada." }
  }

  const { error } = await supabase
    .from("housings")
    .update({
      status,
      updated_by: sesi.userId,
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)

  if (error) return { ok: false, error: pesanGalat(error) }
  segarkan()
  revalidatePath("/admin/perumahan")
  return { ok: true, id }
}

/** Soft delete — data perumahan punya nilai historis (PRD A-10). */
export async function hapusPerumahan(id: string): Promise<Hasil> {
  const sesi = await stafAtauGagal()
  if (!sesi || sesi.role !== "admin") return { ok: false, error: "Hanya admin yang boleh menghapus." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("housings")
    .update({ deleted_at: new Date().toISOString(), status: "archived", updated_by: sesi.userId })
    .eq("id", id)

  if (error) return { ok: false, error: pesanGalat(error) }
  segarkan()
  revalidatePath("/admin/perumahan")
  return { ok: true, id }
}

export async function simpanKontak(housingId: string, formData: FormData): Promise<Hasil> {
  const sesi = await stafAtauGagal()
  if (!sesi) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }

  const parsed = ContactSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian kontak tidak valid." }
  }

  const supabase = await createClient()
  const { data: adaUtama } = await supabase
    .from("housing_contacts")
    .select("id")
    .eq("housing_id", housingId)
    .eq("is_primary", true)
    .maybeSingle()

  const baris = {
    housing_id: housingId,
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    role_label: parsed.data.role_label ?? "Marketing",
    is_primary: true,
  }

  const { error } = adaUtama
    ? await supabase.from("housing_contacts").update(baris).eq("id", adaUtama.id)
    : await supabase.from("housing_contacts").insert(baris)

  if (error) return { ok: false, error: pesanGalat(error) }
  segarkan()
  revalidatePath(`/admin/perumahan/${housingId}`)
  return { ok: true }
}

// ─────────────────────────── Prospek ───────────────────────────

export async function ubahStatusProspek(
  leadId: string,
  status: "baru" | "dihubungi" | "diproses" | "selesai" | "batal",
): Promise<Hasil> {
  const sesi = await stafAtauGagal()
  if (!sesi) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("leads")
    .update({
      status,
      ...(status === "dihubungi" ? { contacted_at: new Date().toISOString() } : {}),
      ...(status === "selesai" || status === "batal"
        ? { closed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", leadId)

  if (error) return { ok: false, error: pesanGalat(error) }
  revalidatePath("/admin/prospek")
  return { ok: true, id: leadId }
}

export async function tambahCatatanProspek(leadId: string, body: string): Promise<Hasil> {
  const sesi = await stafAtauGagal()
  if (!sesi) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
  const isi = body.trim()
  if (isi.length < 2) return { ok: false, error: "Catatan terlalu pendek." }

  const supabase = await createClient()
  // lead_notes_staff mensyaratkan author_id = auth.uid() pada WITH CHECK.
  const { error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: leadId, body: isi, author_id: sesi.userId })

  if (error) return { ok: false, error: pesanGalat(error) }
  revalidatePath("/admin/prospek")
  return { ok: true, id: leadId }
}

// ─────────────────────────── Sesi ───────────────────────────

export async function keluar() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/admin/login")
}
