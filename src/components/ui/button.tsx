import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative z-10 overflow-hidden isolate",
  {
    variants: {
      variant: {
        default:
          "border border-transparent text-black dark:text-black before:absolute before:-inset-[0px] before:-z-10 before:rounded-md before:bg-[linear-gradient(to_right,hsl(var(--neon-teal)),hsl(var(--whitish-yellow)))] hover:before:bg-[conic-gradient(from_180deg_at_50%_50%,hsl(var(--neon-teal)),hsl(var(--whitish-yellow)),hsl(var(--neon-teal)))] before:bg-[length:200%_200%] before:opacity-100 before:transition-transform before:duration-\[0ms\] hover:before:animate-conic-spin focus-visible:ring-[hsl(var(--neon-teal))]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "text-black dark:text-black bg-white/80 dark:bg-slate-800/80 border-transparent before:absolute before:-inset-[1px] before:-z-10 before:rounded-md before:bg-[linear-gradient(to_right,hsl(var(--neon-teal)),hsl(var(--whitish-yellow)))] before:p-[1px] before:content-[''] hover:before:bg-[conic-gradient(from_180deg_at_50%_50%,hsl(var(--neon-teal)),hsl(var(--whitish-yellow)),hsl(var(--neon-teal)))] hover:before:animate-conic-spin focus-visible:ring-[hsl(var(--neon-teal))]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
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
