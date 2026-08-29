import { cn } from "../lib/utils"

interface CoordProps {
  lat: number
  lng: number
  className?: string
  /** Render as a block so it can sit on its own line. */
  as?: "span" | "div"
}

/**
 * The signature element of ATLAS SIANTAR: a real latitude/longitude read
 * straight off the `Housing` record and set as a micro-label.
 *
 * LU/LS = Lintang Utara/Selatan, BT/BB = Bujur Timur/Barat.
 */
export function Coord({ lat, lng, className, as: Tag = "span" }: CoordProps) {
  const ns = lat >= 0 ? "LU" : "LS"
  const ew = lng >= 0 ? "BT" : "BB"

  return (
    <Tag className={cn("text-coord text-muted-foreground", className)}>
      {Math.abs(lat).toFixed(4)}° {ns} · {Math.abs(lng).toFixed(4)}° {ew}
    </Tag>
  )
}

/** Geographic centroid of a set of coordinates — used for the hero label. */
export function centroid(points: { lat: number; lng: number }[]) {
  if (!points.length) return { lat: 0, lng: 0 }
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  )
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}
