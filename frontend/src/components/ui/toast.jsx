"use client";
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva } from "class-variance-authority";
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const TOAST_TEXT_FADE_OUT_MS = 130
const TOAST_TEXT_FADE_IN_MS = 220

function AnimatedToastText({ children, className }) {
  const [renderedChildren, setRenderedChildren] = React.useState(children)
  const [phase, setPhase] = React.useState("")
  const isFirstRenderRef = React.useRef(true)
  const previousChildrenRef = React.useRef(children)
  const fadeOutTimeoutRef = React.useRef(null)
  const fadeInTimeoutRef = React.useRef(null)

  React.useEffect(() => {
    return () => {
      if (fadeOutTimeoutRef.current) {
        window.clearTimeout(fadeOutTimeoutRef.current)
      }
      if (fadeInTimeoutRef.current) {
        window.clearTimeout(fadeInTimeoutRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      previousChildrenRef.current = children
      setRenderedChildren(children)
      return
    }

    if (Object.is(previousChildrenRef.current, children)) {
      return
    }

    previousChildrenRef.current = children

    if (fadeOutTimeoutRef.current) {
      window.clearTimeout(fadeOutTimeoutRef.current)
    }
    if (fadeInTimeoutRef.current) {
      window.clearTimeout(fadeInTimeoutRef.current)
    }

    setPhase("toast-text-leave")
    fadeOutTimeoutRef.current = window.setTimeout(() => {
      setRenderedChildren(children)
      setPhase("toast-text-enter")
      fadeInTimeoutRef.current = window.setTimeout(() => {
        setPhase("")
      }, TOAST_TEXT_FADE_IN_MS)
    }, TOAST_TEXT_FADE_OUT_MS)
  }, [children])

  return (
    <span className={cn("block toast-text-transition", phase, className)}>
      {renderedChildren}
    </span>
  )
}

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props} />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "toast-shell group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-[transform,opacity,box-shadow] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), "toast-text-rendering", className)}
      {...props} />
  );
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props} />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}>
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  >
    <AnimatedToastText>{props.children}</AnimatedToastText>
  </ToastPrimitives.Title>
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props}>
    <AnimatedToastText>{props.children}</AnimatedToastText>
  </ToastPrimitives.Description>
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction };
