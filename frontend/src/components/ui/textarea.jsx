import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "panel-input flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base font-normal text-foreground shadow-sm transition-[border-color,box-shadow,background-color,color] duration-200 ease-out placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
