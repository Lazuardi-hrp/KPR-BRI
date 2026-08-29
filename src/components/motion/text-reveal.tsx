"use client"

import { motion, useReducedMotion } from "motion/react"

interface WordsRevealProps {
  text: string
  className?: string
  /** seconds before the first word animates */
  delay?: number
  /** seconds between each word */
  stagger?: number
  /**
   * `"mount"` fires immediately (hero, above the fold).
   * `"view"` fires on scroll into view, matching <Reveal>.
   */
  trigger?: "mount" | "view"
}

/**
 * Animates a string word-by-word, each word rising from behind a mask.
 * Reduced-motion users get the plain string.
 */
export function WordsReveal({
  text,
  className,
  delay = 0,
  stagger = 0.08,
  trigger = "view",
}: WordsRevealProps) {
  const reduce = useReducedMotion()
  const words = text.split(" ")

  if (reduce) return <span className={className}>{text}</span>

  // Above the fold, the same effect runs from CSS. Framer's `initial` would
  // ship opacity:0 / y:110% in the static HTML and hold LCP until hydration.
  if (trigger === "mount") {
    return (
      <span className={className} style={{ display: "inline-block" }}>
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="word-mask">
            <span style={{ animationDelay: `${delay + i * stagger}s` }}>{word}</span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    )
  }

  return (
    <motion.span
      className={className}
      style={{ display: "inline-block" }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      variants={{
        hidden: {},
        show: { transition: { delayChildren: delay, staggerChildren: stagger } },
      }}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "bottom",
          }}
        >
          <motion.span
            style={{ display: "inline-block", willChange: "transform" }}
            variants={{
              hidden: { y: "110%" },
              show: {
                y: 0,
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  )
}
