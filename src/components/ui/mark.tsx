import { cn } from "@/lib/utils"

interface MarkProps {
  children: React.ReactNode
  /** Use on dark/ink surfaces for stronger opacity */
  onDark?: boolean
  className?: string
}

/**
 * Inline paint-highlight mark — wraps selected words/phrases in a
 * thick orange marker stroke that sits behind the text.
 *
 * Usage:
 *   <h2>Kenapa memilih <Mark>KPR Bersubsidi BRI</Mark></h2>
 */
export function Mark({ children, onDark = false, className }: MarkProps) {
  return (
    <mark
      className={cn(
        "paint-mark bg-transparent text-inherit",
        onDark && "paint-mark--on-dark",
        className,
      )}
    >
      {children}
    </mark>
  )
}
