import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import HousingForm from "@/components/admin/housing-form"
import { getRegions } from "@/lib/queries/admin"

export const dynamic = "force-dynamic"

export default async function PerumahanBaru() {
  const regions = await getRegions()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/perumahan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar
      </Link>
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
          Perumahan baru
        </h1>
        {/* Foto disimpan di bawah housing_id, dan id itu baru ada setelah
            baris perumahannya tersimpan. Menyebutkannya di sini lebih baik
            daripada membiarkan admin mencari kolom unggah yang memang belum
            bisa ada. Setelah simpan, halaman ini berpindah ke layar edit yang
            sudah memuat pengelola galeri. */}
        <p className="mt-1 text-muted-foreground">
          Simpan data dasarnya lebih dulu — galeri foto terbuka setelah perumahan ini punya
          identitas.
        </p>
      </div>
      <HousingForm awal={{ status: "draft", needs_review: false }} regions={regions} />
    </div>
  )
}
