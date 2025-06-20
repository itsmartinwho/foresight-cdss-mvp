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
            "relative overflow-hidden text-white",
            "bg-[linear-gradient(135deg,_hsl(var(--custom-blue-teal)/0.35),_hsl(var(--custom-blue-teal)/0.15))]",
            "[backdrop-filter:blur(20px)_brightness(1.1)]",
            "transform-gpu [transform:translateY(-6px)_rotateY(5deg)]",
            "shadow-md shadow-[rgba(0,0,0,0.25)] border border-[hsl(var(--custom-blue-teal)/0.4)]",
            "hover:brightness-[1.15]"
          ].join(" "),
        secondary:
          [
            "relative overflow-hidden text-foreground",
            "bg-[linear-gradient(135deg,_rgba(255,255,255,0.2),_rgba(255,255,255,0.05))]",
            "[backdrop-filter:blur(20px)_brightness(1.1)]",
            "transform-gpu [transform:translateY(-6px)_rotateY(5deg)]",
            "shadow-md shadow-[rgba(0,0,0,0.15)] border border-white/30",
            "hover:brightness-[1.15]"
          ].join(" "),
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:brightness-[1.3]",
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
