import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import ThemeCustomizerDialog from '@/components/ThemeCustomizerDialog';

function ThemeIndicatorIcon({ theme, resolvedTheme }) {
  if (theme === 'custom') {
    return <Palette className="h-4 w-4" />;
  }

  if (theme === 'system') {
    return <Monitor className="h-4 w-4" />;
  }

  return resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
}

export default function ThemeToggle({ isCollapsed }) {
  const { t } = useTranslation('sidebar');
  const theme = useAppStore((state) => state.theme);
  const resolvedTheme = useAppStore((state) => state.resolvedTheme);
  const setTheme = useAppStore((state) => state.setTheme);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const triggerRef = useRef(null);

  const themeOptions = useMemo(
    () => [
      { value: 'light', label: t('theme.light'), icon: Sun },
      { value: 'dark', label: t('theme.dark'), icon: Moon },
      { value: 'system', label: t('theme.system'), icon: Monitor },
    ],
    [t]
  );

  const blurTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      triggerRef.current?.blur();
    });
  }, []);

  const handleCustomizerOpenChange = useCallback(
    (nextOpen) => {
      setIsCustomizerOpen(nextOpen);
      blurTrigger();
    },
    [blurTrigger]
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {isCollapsed ? (
            <Button
              ref={triggerRef}
              variant="ghost"
              size="icon"
              title={t('theme.label')}
              aria-label={t('theme.label')}
              className="mx-auto flex text-muted-foreground transition-[background-color,color] duration-300 ease-out hover:text-foreground hover:bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <ThemeIndicatorIcon theme={theme} resolvedTheme={resolvedTheme} />
              </div>
            </Button>
          ) : (
            <Button
              ref={triggerRef}
              variant="ghost"
              className="w-full rounded-md text-sm font-medium transition-[background-color,color,gap,padding] duration-300 ease-out focus-visible:ring-0 focus-visible:ring-offset-0 h-9 justify-start px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <ThemeIndicatorIcon theme={theme} resolvedTheme={resolvedTheme} />
              </div>
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform,margin] duration-300 ease-out',
                  'ml-2 max-w-[120px] opacity-100 translate-x-0'
                )}
              >
                {t('theme.label')}
              </span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {theme === value && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setTheme('custom');
              handleCustomizerOpenChange(true);
            }}
            className="flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            <span>{t('theme.custom')}</span>
            {theme === 'custom' && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeCustomizerDialog open={isCustomizerOpen} onOpenChange={handleCustomizerOpenChange} />
    </>
  );
}
