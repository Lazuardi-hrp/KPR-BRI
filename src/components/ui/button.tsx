import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-[transform,background-color,box-shadow,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-brand-deep",
        outline:
          "border border-border bg-white text-primary hover:border-primary/40 hover:bg-primary/[0.04]",
        accent:
          "bg-brand-orange text-brand-orange-fg shadow-sm shadow-brand-orange/25 hover:brightness-[0.97]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        ghost:
          "text-primary hover:bg-primary/[0.06]",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-accent",
        /* Primary CTA on a bg-ink surface. */
        ink:
          "bg-white text-primary shadow-ink hover:bg-mist-200 ring-offset-ink focus-visible:ring-brand-orange",
        /* Secondary CTA on a bg-ink surface. */
        "ink-outline":
          "border border-white/25 text-white hover:border-brand-orange/40 hover:bg-white/10 ring-offset-ink focus-visible:ring-brand-orange",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-11 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
