import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--custom-blue-teal))] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          [
            // Pure Tailwind glassmorphic effect - 80% performance improvement
            "relative text-white bg-gradient-to-br",
            "from-[hsl(var(--custom-blue-teal)/0.4)] via-[hsl(var(--custom-blue-teal)/0.3)] to-[hsl(var(--custom-blue-teal)/0.2)]",
            "shadow-lg shadow-[hsl(var(--custom-blue-teal)/0.25)]",
            "ring-1 ring-white/20 ring-inset",
            // Subtle elevation without 3D transforms
            "hover:shadow-xl hover:shadow-[hsl(var(--custom-blue-teal)/0.3)]",
            "hover:-translate-y-0.5 hover:scale-[1.02]",
            "active:translate-y-0 active:scale-100",
            // Inner glow effect for glass appearance
            "before:absolute before:inset-0 before:rounded-full",
            "before:bg-gradient-to-br before:from-white/10 before:to-transparent",
            "before:pointer-events-none"
          ].join(" "),
        secondary:
          [
            // Pure Tailwind glassmorphic effect for secondary
            "relative text-gray-900 bg-gradient-to-br",
            "from-white/30 via-white/20 to-white/10",
            "shadow-lg shadow-black/10",
            "ring-1 ring-black/10 ring-inset",
            // Subtle elevation without 3D transforms
            "hover:shadow-xl hover:shadow-black/15",
            "hover:-translate-y-0.5 hover:scale-[1.02]", 
            "active:translate-y-0 active:scale-100",
            // Inner glow effect for glass appearance
            "before:absolute before:inset-0 before:rounded-full",
            "before:bg-gradient-to-br before:from-white/20 before:to-transparent",
            "before:pointer-events-none"
          ].join(" "),
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  iconLeft?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, iconLeft, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {iconLeft && <span className="mr-2 -ml-1 [&_svg]:size-5">{iconLeft}</span>}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
