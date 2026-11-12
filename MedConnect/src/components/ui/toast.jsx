import * as React from "react"
import { Toast as ToastPrimitive } from "radix-ui"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { XIcon } from "lucide-react"

/**
 * Toast acessível sobre Radix UI Toast.
 * - Anúncio via aria-live gerenciado pelo Radix (foreground = assertive, background = polite)
 * - Arrastar para a direita dispensa (swipe)
 * - Entrada 280ms ease-out, saída 160ms (saídas mais rápidas que entradas)
 */

const ToastProvider = ToastPrimitive.Provider

function ToastViewport({ className, ...props }) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed z-[100] flex max-h-dvh w-full flex-col-reverse gap-2.5 p-4 outline-none",
        "bottom-0 left-0 sm:bottom-4 sm:left-auto sm:right-4 sm:top-auto sm:w-[390px] sm:flex-col",
        className
      )}
      {...props}
    />
  )
}

const toastVariants = cva(
  [
    "group/toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border bg-popover p-4 pr-10 text-popover-foreground shadow-[0_12px_32px_-12px_hsl(190_30%_12%/0.28)]",
    "data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=cancel]:duration-200",
    "data-[swipe=end]:animate-toast-swipe-out",
  ].join(" "),
  {
    variants: {
      variant: {
        info: "border-border",
        success: "border-[color-mix(in_oklab,var(--success)_35%,var(--border))]",
        warning: "border-[color-mix(in_oklab,var(--amber)_40%,var(--border))]",
        error: "border-[color-mix(in_oklab,var(--destructive)_40%,var(--border))]",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const accentBar = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-amber",
  error: "bg-destructive",
}

function Toast({ className, variant = "info", children, ...props }) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-variant={variant}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", accentBar[variant] || accentBar.info)} />
      {children}
    </ToastPrimitive.Root>
  )
}

function ToastTitle({ className, ...props }) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("font-heading text-[0.9375rem] font-semibold leading-snug", className)}
      {...props}
    />
  )
}

function ToastDescription({ className, ...props }) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function ToastAction({ className, ...props }) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "mt-2 inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

function ToastClose({ className, label = "Fechar aviso", ...props }) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label={label}
      className={cn(
        "absolute right-2.5 top-2.5 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      <XIcon className="size-4" />
    </ToastPrimitive.Close>
  )
}

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose }
