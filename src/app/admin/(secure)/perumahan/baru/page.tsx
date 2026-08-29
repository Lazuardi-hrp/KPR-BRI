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
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-foreground">
        Perumahan baru
      </h1>
      <HousingForm awal={{ status: "draft", needs_review: false }} regions={regions} />
    </div>
  )
}
