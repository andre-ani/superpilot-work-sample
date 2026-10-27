import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

export const selectionCardSurface = "rounded-xl border border-border bg-background shadow-md shadow-black/10 dark:shadow-black/35 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:ring-1 hover:ring-primary/20 group-hover/selection-card:border-primary group-hover/selection-card:ring-1 group-hover/selection-card:ring-primary/20 focus-within:border-primary data-[selected=true]:border-primary data-[selected=true]:ring-1 data-[selected=true]:ring-primary/20 motion-reduce:transition-none"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        "context-add": "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground group-hover/selection-card:bg-primary group-hover/selection-card:text-primary-foreground focus-visible:bg-primary focus-visible:text-primary-foreground",
        "context-selected": "bg-primary text-primary-foreground hover:bg-red-100 hover:text-red-700 focus-visible:bg-red-100 focus-visible:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-200 dark:focus-visible:bg-red-950 dark:focus-visible:text-red-200",
        "context-remove": "text-muted-foreground hover:bg-red-100 hover:text-red-700 focus-visible:bg-red-100 focus-visible:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-200 dark:focus-visible:bg-red-950 dark:focus-visible:text-red-200",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        "sidebar-ghost": "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
        "composer-next": "bg-primary text-white hover:bg-primary/90",
        "brand-guidelines": "bg-muted/20 text-foreground/80 hover:bg-muted/35 focus-visible:bg-muted/35",
        "chat-dismiss": "bg-background text-foreground shadow-sm hover:bg-muted",
        glass: 'chat-glass text-foreground hover:brightness-105',
        link: "text-primary underline-offset-4 hover:underline",
        product: `${selectionCardSurface} group flex-col items-stretch overflow-hidden text-left whitespace-normal`,
        editable: "group justify-between border border-transparent bg-transparent text-left whitespace-normal hover:border-input hover:bg-muted/50",
        "editable-text": "group border border-transparent bg-transparent text-center whitespace-normal hover:border-input hover:bg-muted/40 focus-visible:border-input focus-visible:bg-muted/40",
        swatch: "group relative overflow-hidden border border-border/50 text-left shadow-none hover:ring-2 hover:ring-ring/40",
        logo: "group relative overflow-hidden border border-input bg-white text-neutral-700 hover:bg-white",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        "menu-sm": "h-8 w-full justify-start gap-2 rounded-md px-2 py-1 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        "composer-next": "h-9 gap-1.5 rounded-full px-3 text-xs font-medium has-[>svg]:px-3",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
        product: "h-auto w-full justify-start gap-0 p-0",
        thumbnail: "size-16 shrink-0 overflow-hidden p-1",
        editable: "h-auto min-h-10 w-full gap-3 px-2 py-2 text-sm font-normal leading-relaxed",
        "editable-name": "h-auto min-h-10 w-fit max-w-full gap-3 px-2 py-1 text-xl font-semibold tracking-tight",
        "editable-font": "h-auto min-h-9 w-fit max-w-full gap-2 px-2 py-1 text-sm font-normal",
        "card-title": "relative h-auto min-h-11 w-full gap-0 px-1 py-1 text-center text-[28px] font-bold leading-tight tracking-tight hover:border-input hover:bg-muted/40 focus-visible:border-input focus-visible:bg-muted/40",
        "card-copy": "relative h-auto min-h-10 w-full gap-0 px-1 py-1 text-center text-[13px] font-normal leading-[1.6]",
        "card-logo": "size-32 shrink-0 overflow-visible rounded-full border-border/70 bg-white p-2 shadow-sm hover:border-input hover:bg-white focus-visible:border-input focus-visible:bg-white",
        "brand-guidelines": "h-11 w-full justify-center rounded-none px-6 focus-visible:ring-inset",
        "brand-dock": "h-12 max-w-full gap-3 rounded-xl px-3 py-1.5 text-left shadow-sm",
        "chat-preview": "h-14 w-full justify-start rounded-2xl px-4 py-2 text-left text-[13px] font-normal leading-5 whitespace-normal",
        "chat-close": "size-6 rounded-full p-0",
        swatch: "h-14 min-w-0 flex-1 rounded-lg p-2 sm:h-16",
        "card-swatch": "h-10 min-w-0 flex-1 rounded-md p-0",
        logo: "h-20 w-24 shrink-0 rounded-lg p-3 sm:h-24 sm:w-28",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
