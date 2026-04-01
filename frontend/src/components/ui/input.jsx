import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, syncAutofill = false, onAnimationStart, onChange, ...props }, ref) => {
  const innerRef = React.useRef(null)

  const setRefs = React.useCallback(
    (node) => {
      innerRef.current = node

      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref]
  )

  const handleAnimationStart = React.useCallback(
    (event) => {
      onAnimationStart?.(event)

      if (!syncAutofill || event.animationName !== "auth-input-autofill") {
        return
      }

      const node = innerRef.current
      if (!node || typeof onChange !== "function") {
        return
      }

      requestAnimationFrame(() => {
        onChange({
          target: node,
          currentTarget: node,
        })
      })
    },
    [onAnimationStart, onChange, syncAutofill]
  )

  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={setRefs}
      onAnimationStart={handleAnimationStart}
      onChange={onChange}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
