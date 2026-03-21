import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-zinc-800 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-50 text-zinc-900 shadow hover:bg-zinc-50/80",
        secondary: "border-transparent bg-zinc-800 text-zinc-50 hover:bg-zinc-800/80",
        destructive: "border-transparent bg-red-900/50 text-red-50 shadow hover:bg-red-900/80",
        outline: "text-zinc-50",
        indigo: "border-transparent bg-indigo-500/20 text-indigo-400",
        emerald: "border-transparent bg-emerald-500/20 text-emerald-400",
        amber: "border-transparent bg-amber-500/20 text-amber-400",
        blue: "border-transparent bg-blue-500/20 text-blue-400",
        purple: "border-transparent bg-purple-500/20 text-purple-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
