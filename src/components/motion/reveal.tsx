"use client"

import { motion, useReducedMotion, type Variants } from "motion/react"
import type { ReactNode } from "react"

type Direction = "up" | "down" | "left" | "right" | "none"

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger delay in seconds */
  delay?: number
  /** Travel direction of the reveal */
  direction?: Direction
  /** Distance travelled in px */
  distance?: number
  /** Re-trigger every time it enters view */
  once?: boolean
}

const offset = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up":
      return { y: distance }
    case "down":
      return { y: -distance }
    case "left":
      return { x: distance }
    case "right":
      return { x: -distance }
    default:
      return {}
  }
}

/**
 * Scroll-triggered fade + slide reveal. Reduced-motion users get an
 * instant, transform-free fade (handled by the global media query and the
 * small travel distance collapsing to opacity only).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 26,
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion()

  // Reduced motion gets the finished state outright — never an opacity-0 block
  // waiting on a scroll event.
  if (reduce) return <div className={className}>{children}</div>

  const variants: Variants = {
    hidden: { opacity: 0, ...offset(direction, distance) },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-12% 0px -12% 0px" }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Wrap a group of <RevealItem> children to cascade their entrance.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  once = true,
}: {
  children: ReactNode
  className?: string
  stagger?: number
  once?: boolean
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-12% 0px -12% 0px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  className,
  direction = "up",
  distance = 26,
}: {
  children: ReactNode
  className?: string
  direction?: Direction
  distance?: number
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, ...offset(direction, distance) },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
