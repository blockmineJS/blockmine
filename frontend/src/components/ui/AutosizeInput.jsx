import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';

const AutosizeInput = React.forwardRef(({ className, value, onChange, fullWidth = false, minWidth = 96, placeholder = '', ...props }, ref) => {
  const [inputWidth, setInputWidth] = useState(0);
  const spanRef = useRef(null);
  const displayText = useMemo(() => {
    const nextValue = value ?? '';
    if (String(nextValue).length > 0) {
      return String(nextValue);
    }
    return placeholder || ' ';
  }, [placeholder, value]);

  useLayoutEffect(() => {
    if (spanRef.current) {
      setInputWidth(Math.max(spanRef.current.offsetWidth + 16, minWidth));
    }
  }, [displayText, minWidth]);

  return (
    <div className={cn("relative max-w-full", fullWidth ? "w-full" : "inline-block")}>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        className={cn("h-8 transition-all duration-200 ease-in-out", className)}
        style={{ width: fullWidth ? '100%' : inputWidth }}
        placeholder={placeholder}
        {...props}
      />
      <span
        ref={spanRef}
        className="absolute invisible whitespace-pre px-2 py-1 text-sm font-normal tracking-normal"
      >
        {displayText}
      </span>
    </div>
  );
});

AutosizeInput.displayName = 'AutosizeInput';

export { AutosizeInput };

