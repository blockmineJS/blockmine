import * as React from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export default function CommandMenu({ items, onClose, position, onSelect }) {
  const menuRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className="fixed z-50"
        style={{ top: position.top, left: position.left }}
      >
        <Command className="rounded-lg border shadow-md w-64">
          <CommandInput ref={inputRef} placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {items.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.children.map((item) => (
                <CommandItem 
                  key={item.label} 
                  onSelect={() => onSelect(item)}
                >
                  {item.label}
                </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </div>
    </>
  )
}
