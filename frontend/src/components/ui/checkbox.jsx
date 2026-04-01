import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary/70 bg-background shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] data-[state=unchecked]:shadow-sm",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator
      forceMount
      className={cn(
        "flex items-center justify-center text-current transition-[opacity,transform] duration-200 ease-out data-[state=checked]:scale-100 data-[state=checked]:opacity-100 data-[state=unchecked]:scale-50 data-[state=unchecked]:opacity-0"
      )}
    >
      <Check className="h-3.5 w-3.5 transition-transform duration-200 ease-out data-[state=checked]:scale-100 data-[state=unchecked]:scale-75" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
