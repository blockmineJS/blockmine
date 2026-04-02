import * as React from "react"
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export default function CommandMenu({ items, onClose, position, onSelect, containerRef }) {
  const { t } = useTranslation('visual-editor');
  const menuRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const [clampedPosition, setClampedPosition] = React.useState(position);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  React.useLayoutEffect(() => {
    const menuEl = menuRef.current;
    const containerEl = containerRef?.current;

    if (!menuEl || !containerEl) {
      setClampedPosition(position);
      return;
    }

    const padding = 12;
    const maxLeft = Math.max(padding, containerEl.clientWidth - menuEl.offsetWidth - padding);
    const maxTop = Math.max(padding, containerEl.clientHeight - menuEl.offsetHeight - padding);

    setClampedPosition({
      left: Math.min(Math.max(position.left, padding), maxLeft),
      top: Math.min(Math.max(position.top, padding), maxTop),
    });
  }, [position, containerRef]);

  return (
    <>
      <motion.div
        className="absolute inset-0 z-40 bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className="absolute z-50"
        style={{ top: clampedPosition.top, left: clampedPosition.left }}
      >
        <motion.div
          className="relative overflow-hidden rounded-lg"
          style={{ willChange: 'transform, opacity, filter' }}
          initial={{ opacity: 0, scale: 0.955, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.982, y: 5 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              backgroundColor: 'hsl(var(--popover) / 0.84)',
              border: '1px solid hsl(var(--border) / 0.6)',
              boxShadow: '0 24px 72px rgba(0, 0, 0, 0.36)',
            }}
          />
          <motion.div
            style={{ willChange: 'filter' }}
            initial={{ filter: 'blur(16px) saturate(0.92)' }}
            animate={{ filter: 'blur(0px) saturate(1)' }}
            exit={{ filter: 'blur(10px) saturate(0.96)' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Command className="relative w-[320px] rounded-lg border-0 bg-transparent shadow-none">
              <CommandInput ref={inputRef} placeholder={t('contextMenu.searchPlaceholder')} />
              <CommandList>
                <CommandEmpty>{t('contextMenu.noResults')}</CommandEmpty>
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
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
