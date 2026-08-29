import LandingView from "@/components/landing-view"
import { getPublishedHousings } from "@/lib/queries/housings"
import { getSiteStats } from "@/lib/queries/stats"

/**
 * Shell RSC. Seluruh tampilan ada di LandingView (client component) — ia tetap
 * "use client" karena useTranslation() adalah React context, bukan karena data.
 * Yang berpindah ke server hanyalah pengambilan datanya.
 */
export const revalidate = 300

export default async function Page() {
  const housing = await getPublishedHousings()
  const stats = await getSiteStats(housing)
  return <LandingView housing={housing} stats={stats} />
}
