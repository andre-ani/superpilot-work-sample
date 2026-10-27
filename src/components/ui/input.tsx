import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, variant = "default", ...props }: React.ComponentProps<"input"> & {
  variant?: "default" | "composer" | "search" | "inline" | "inline-name" | "card-title"
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        variant === "composer" && "h-14 rounded-xl pl-5 pr-16 text-base shadow-sm md:text-base",
        variant === "search" && "pl-9",
        variant === "inline" && "h-9 px-2 shadow-none",
        variant === "inline-name" && "h-10 w-auto min-w-24 max-w-64 field-sizing-content px-2 text-xl font-semibold tracking-tight shadow-none md:text-xl",
        variant === 'card-title' && 'h-12 text-center text-[28px] font-bold leading-tight shadow-none md:text-[28px]',
        ["inline", "inline-name", "card-title"].includes(variant) && "h-full transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:ring-1 focus-visible:ring-ring/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
