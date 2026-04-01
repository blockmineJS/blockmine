import * as React from "react"

import { cn } from "@/lib/utils"

const isTransparentColor = (value) => !value || value === "transparent" || value === "rgba(0, 0, 0, 0)"

const syncAutofillSurfaceVars = (node) => {
  if (!node || typeof window === "undefined") {
    return
  }

  const inputStyles = window.getComputedStyle(node)
  let autofillBackground = inputStyles.backgroundColor
  let surfaceNode = node.parentElement

  while (isTransparentColor(autofillBackground) && surfaceNode) {
    const surfaceStyles = window.getComputedStyle(surfaceNode)
    if (!isTransparentColor(surfaceStyles.backgroundColor)) {
      autofillBackground = surfaceStyles.backgroundColor
      break
    }
    surfaceNode = surfaceNode.parentElement
  }

  node.style.setProperty("--panel-autofill-bg", autofillBackground)
  node.style.setProperty("--panel-autofill-font-family", inputStyles.fontFamily)
  node.style.setProperty("--panel-autofill-font-size", inputStyles.fontSize)
  node.style.setProperty("--panel-autofill-line-height", inputStyles.lineHeight)
  node.style.setProperty("--panel-autofill-font-style", inputStyles.fontStyle)
  node.style.setProperty("--panel-autofill-font-weight", inputStyles.fontWeight)
  node.style.setProperty("--panel-autofill-letter-spacing", inputStyles.letterSpacing)
}

const Input = React.forwardRef(({ className, type, syncAutofill = true, onAnimationStart, onChange, ...props }, ref) => {
  const innerRef = React.useRef(null)

  const setRefs = React.useCallback(
    (node) => {
      innerRef.current = node

      if (node) {
        requestAnimationFrame(() => {
          syncAutofillSurfaceVars(node)
        })
      }

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

      if (!syncAutofill || event.animationName !== "panel-input-autofill") {
        return
      }

      const node = innerRef.current
      if (!node || typeof onChange !== "function") {
        return
      }

      requestAnimationFrame(() => {
        syncAutofillSurfaceVars(node)
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
        "panel-input flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base font-normal text-foreground shadow-sm transition-[border-color,box-shadow,background-color,color] duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
