import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const PasswordInput = React.forwardRef(
  (
    {
      className,
      inputClassName,
      buttonClassName,
      showLabel = "Show password",
      hideLabel = "Hide password",
      syncAutofill = false,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(false)
    const [transitionPhase, setTransitionPhase] = React.useState("idle")
    const transitionTimeoutRef = React.useRef(null)
    const settleTimeoutRef = React.useRef(null)

    React.useEffect(() => {
      return () => {
        if (transitionTimeoutRef.current) {
          window.clearTimeout(transitionTimeoutRef.current)
        }
        if (settleTimeoutRef.current) {
          window.clearTimeout(settleTimeoutRef.current)
        }
      }
    }, [])

    const handleToggle = React.useCallback(() => {
      if (props.disabled) {
        return
      }

      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }

      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current)
      }

      setTransitionPhase("out")

      transitionTimeoutRef.current = window.setTimeout(() => {
        setIsVisible((current) => !current)
        setTransitionPhase("in")

        settleTimeoutRef.current = window.setTimeout(() => {
          setTransitionPhase("idle")
        }, 170)
      }, 90)
    }, [props.disabled])

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn(
            "pr-10 transition-[opacity,transform,filter] duration-150 ease-out",
            transitionPhase === "out" && "opacity-65 scale-[0.992] blur-[0.35px]",
            transitionPhase === "in" && "opacity-100 scale-100 blur-0",
            inputClassName
          )}
          syncAutofill={syncAutofill}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-0 top-0 h-9 w-9 rounded-l-none text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:opacity-100",
            buttonClassName
          )}
          aria-label={isVisible ? hideLabel : showLabel}
          aria-pressed={isVisible}
          onClick={handleToggle}
          disabled={props.disabled}
        >
          <span className="relative h-4 w-4">
            <Eye
              className={cn(
                "absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-200 ease-out",
                isVisible ? "opacity-0 scale-75 -rotate-12" : "opacity-100 scale-100 rotate-0"
              )}
            />
            <EyeOff
              className={cn(
                "absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-200 ease-out",
                isVisible ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 rotate-12"
              )}
            />
          </span>
        </Button>
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
