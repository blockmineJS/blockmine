import React, { useState, useRef, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';

const AutosizeInput = React.forwardRef(({ className, value, onChange, ...props }, ref) => {
  const [inputWidth, setInputWidth] = useState(0);
  const spanRef = useRef(null);

  useLayoutEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.offsetWidth);
    }
  }, [value]);

  return (
    <div className="relative inline-block">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        className={cn("h-8 transition-all duration-200 ease-in-out", className)}
        style={{ width: inputWidth + 16 }} // +16 for some padding
        {...props}
      />
      <span ref={spanRef} className="absolute invisible whitespace-pre text-sm px-3 py-1">{value}</span>
    </div>
  );
});

AutosizeInput.displayName = 'AutosizeInput';

export { AutosizeInput };

