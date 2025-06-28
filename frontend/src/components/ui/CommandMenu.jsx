import * as React from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export default function CommandMenu({ items, onClose, position }) {
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      <Command className="rounded-lg border shadow-md w-64">
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {items.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.children.map((item) => (
              <CommandItem 
                key={item.label} 
                onSelect={item.onClick}
              >
                {item.label}
              </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  )
}
