import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import {
  applyCustomThemePreviewToDocument,
  CUSTOM_THEME_COLOR_FIELDS,
  CUSTOM_THEME_SECTIONS,
  hexToHsl,
  hslToHex,
  parseColorInput,
  sanitizeCustomTheme,
} from '@/lib/themeUtils';
import { Moon, Palette, RotateCcw, Sun } from 'lucide-react';

const QUICK_SWATCHES = [
  '#09090B',
  '#141418',
  '#27272A',
  '#3F3F46',
  '#FFFFFF',
  '#FAFAFA',
  '#E4E4E7',
  '#7C3AED',
  '#A855F7',
  '#2563EB',
  '#10B981',
  '#F59E0B',
];

const HSL_SLIDERS = [
  { key: 'h', min: 0, max: 360, labelKey: 'theme.editor.picker.hue' },
  { key: 's', min: 0, max: 100, labelKey: 'theme.editor.picker.saturation' },
  { key: 'l', min: 0, max: 100, labelKey: 'theme.editor.picker.lightness' },
];

const ThemeColorControl = memo(function ThemeColorControl({
  colorKey,
  value,
  onPreviewColorChange,
  onCommitColorChange,
  t,
}) {
  const field = CUSTOM_THEME_COLOR_FIELDS[colorKey];
  const frameRef = useRef(null);
  const inputValueRef = useRef(value);
  const hslRef = useRef(hexToHsl(value));
  const [inputValue, setInputValue] = useState(value);
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    setInputValue(value);
    if (value === inputValueRef.current) {
      return;
    }
    inputValueRef.current = value;
    const nextHsl = hexToHsl(value);
    hslRef.current = nextHsl;
    setHsl(nextHsl);
  }, [value]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const previewColor = useCallback(
    (nextColor) => {
      const normalized = parseColorInput(nextColor, value);
      setInputValue(normalized);
      inputValueRef.current = normalized;
      const nextHsl = hexToHsl(normalized);
      hslRef.current = nextHsl;
      setHsl(nextHsl);

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        onPreviewColorChange(colorKey, normalized);
      });
    },
    [colorKey, onPreviewColorChange, value]
  );

  const commitColor = useCallback(
    (candidate = inputValueRef.current) => {
      const normalized = parseColorInput(candidate, value);
      setInputValue(normalized);
      inputValueRef.current = normalized;
      onCommitColorChange(colorKey, normalized);
    },
    [colorKey, onCommitColorChange, value]
  );

  const sliderBackgrounds = useMemo(() => {
    const saturationStart = hslToHex({ h: hsl.h, s: 0, l: hsl.l });
    const saturationEnd = hslToHex({ h: hsl.h, s: 100, l: hsl.l });
    const lightnessMid = hslToHex({ h: hsl.h, s: hsl.s, l: 50 });

    return {
      h: 'linear-gradient(90deg, #FF0000 0%, #FFFF00 16.66%, #00FF00 33.33%, #00FFFF 50%, #0000FF 66.66%, #FF00FF 83.33%, #FF0000 100%)',
      s: `linear-gradient(90deg, ${saturationStart} 0%, ${saturationEnd} 100%)`,
      l: `linear-gradient(90deg, #000000 0%, ${lightnessMid} 50%, #FFFFFF 100%)`,
    };
  }, [hsl]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{t(field.labelKey)}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t(field.descriptionKey)}</p>
        </div>
        <div
          className="h-11 w-11 shrink-0 rounded-md border border-border/80 shadow-inner"
          style={{ backgroundColor: inputValue }}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Popover
          open={isPickerOpen}
          onOpenChange={(nextOpen) => {
            setIsPickerOpen(nextOpen);
            if (!nextOpen) {
              commitColor();
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-11 shrink-0 rounded-xl p-0 aspect-square"
            >
              <div
                className="h-7 w-7 rounded-sm border border-border/80 shadow-sm"
                style={{ backgroundColor: inputValue }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[316px] rounded-2xl border-border/80 bg-popover/95 p-4 shadow-xl backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-md border border-border/80 shadow-inner"
                  style={{ backgroundColor: inputValue }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t('theme.editor.picker.title')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t('theme.editor.picker.description')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {QUICK_SWATCHES.map((swatch) => (
                  <button
                    key={`${colorKey}-${swatch}`}
                    type="button"
                    onClick={() => previewColor(swatch)}
                    className="h-9 w-full rounded-xl border border-border/80 transition-transform duration-150 hover:scale-[1.04]"
                    style={{ backgroundColor: swatch }}
                    aria-label={`${t(field.labelKey)} ${swatch}`}
                  />
                ))}
              </div>

              <div className="space-y-3">
                {HSL_SLIDERS.map((slider) => (
                  <div key={`${colorKey}-${slider.key}`} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-foreground">{t(slider.labelKey)}</span>
                      <span className="text-xs font-mono text-muted-foreground">{hsl[slider.key]}</span>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      step={1}
                      value={hsl[slider.key]}
                      onChange={(event) => {
                        const nextHsl = {
                          ...hslRef.current,
                          [slider.key]: Number(event.target.value),
                        };
                        hslRef.current = nextHsl;
                        setHsl(nextHsl);
                        const nextColor = hslToHex(nextHsl);
                        inputValueRef.current = nextColor;
                        setInputValue(nextColor);
                        onPreviewColorChange(colorKey, nextColor);
                      }}
                      onPointerUp={() => commitColor()}
                      onKeyUp={() => commitColor()}
                      className="theme-color-slider"
                      style={{ background: sliderBackgrounds[slider.key] }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Input
          value={inputValue}
          onChange={(event) => {
            const nextValue = event.target.value.toUpperCase();
            setInputValue(nextValue);
            inputValueRef.current = nextValue;
            const parsedValue = parseColorInput(nextValue, null);
            if (parsedValue) {
              const nextHsl = hexToHsl(parsedValue);
              hslRef.current = nextHsl;
              setHsl(nextHsl);
              onPreviewColorChange(colorKey, parsedValue);
            }
          }}
          onBlur={() => commitColor()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitColor();
            }
          }}
          className="font-mono uppercase tracking-[0.14em]"
          placeholder="#7C3AED"
          maxLength={7}
        />
      </div>
    </div>
  );
});

export default function ThemeCustomizerDialog({ open, onOpenChange }) {
  const { t } = useTranslation('sidebar');
  const theme = useAppStore((state) => state.theme);
  const customTheme = useAppStore((state) => state.customTheme);
  const setTheme = useAppStore((state) => state.setTheme);
  const setCustomThemeBaseTheme = useAppStore((state) => state.setCustomThemeBaseTheme);
  const replaceCustomTheme = useAppStore((state) => state.replaceCustomTheme);
  const resetCustomTheme = useAppStore((state) => state.resetCustomTheme);

  const draftThemeRef = useRef(customTheme);
  const previewFrameRef = useRef(null);
  const pendingPreviewThemeRef = useRef(null);
  const [snapshotTheme, setSnapshotTheme] = useState(customTheme);
  const isCustomThemeActive = theme === 'custom';

  useEffect(() => {
    if (open) {
      const sanitized = sanitizeCustomTheme(customTheme);
      draftThemeRef.current = sanitized;
      setSnapshotTheme(sanitized);
    }
  }, [customTheme, open]);

  useEffect(() => {
    return () => {
      if (previewFrameRef.current) {
        cancelAnimationFrame(previewFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const root = window.document.documentElement;
    if (open && isCustomThemeActive) {
      root.dataset.themeTransition = 'custom';
    } else {
      delete root.dataset.themeTransition;
    }

    return () => {
      delete root.dataset.themeTransition;
    };
  }, [open, isCustomThemeActive]);

  const baseThemeButtons = useMemo(
    () => [
      { value: 'dark', icon: Moon, label: t('theme.dark') },
      { value: 'light', icon: Sun, label: t('theme.light') },
    ],
    [t]
  );

  const applyDraftTheme = useCallback(
    (nextTheme) => {
      draftThemeRef.current = sanitizeCustomTheme(nextTheme);
      if (theme === 'custom') {
        pendingPreviewThemeRef.current = draftThemeRef.current;
        if (previewFrameRef.current) {
          cancelAnimationFrame(previewFrameRef.current);
        }
        previewFrameRef.current = requestAnimationFrame(() => {
          if (pendingPreviewThemeRef.current) {
            applyCustomThemePreviewToDocument(pendingPreviewThemeRef.current);
          }
          previewFrameRef.current = null;
        });
      }
    },
    [theme]
  );

  const handlePreviewColorChange = useCallback(
    (colorKey, nextValue) => {
      const nextTheme = sanitizeCustomTheme({
        ...draftThemeRef.current,
        colors: {
          ...draftThemeRef.current.colors,
          [colorKey]: nextValue,
        },
      });

      applyDraftTheme(nextTheme);
    },
    [applyDraftTheme]
  );

  const handleCommitColorChange = useCallback(
    (colorKey, nextValue) => {
      const nextTheme = sanitizeCustomTheme({
        ...draftThemeRef.current,
        colors: {
          ...draftThemeRef.current.colors,
          [colorKey]: nextValue,
        },
      });

      draftThemeRef.current = nextTheme;
      setSnapshotTheme(nextTheme);
      replaceCustomTheme(nextTheme);
    },
    [replaceCustomTheme]
  );

  const handleBaseThemeChange = (value) => {
    const nextTheme = sanitizeCustomTheme({
      ...draftThemeRef.current,
      baseTheme: value,
    });

    draftThemeRef.current = nextTheme;
    setSnapshotTheme(nextTheme);
    setCustomThemeBaseTheme(value);
    setTheme('custom');
  };

  const handleResetTheme = (baseTheme) => {
    resetCustomTheme(baseTheme);
    const nextTheme = sanitizeCustomTheme({
      ...draftThemeRef.current,
      baseTheme,
      colors: undefined,
    });
    draftThemeRef.current = nextTheme;
    setSnapshotTheme(nextTheme);
    setTheme('custom');
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      const finalTheme = sanitizeCustomTheme(draftThemeRef.current);
      draftThemeRef.current = finalTheme;
      setSnapshotTheme(finalTheme);
      replaceCustomTheme(finalTheme);
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="max-w-[1480px] overflow-hidden border-border/70 bg-background/95 p-0 backdrop-blur-xl"
      >
        <div className="border-b border-border/70 bg-gradient-to-br from-primary/16 via-background to-background px-6 py-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/14 text-primary shadow-lg shadow-primary/10">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {t('theme.editor.title')}
                </DialogTitle>
                <DialogDescription className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {t('theme.editor.description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="grid max-h-[82vh] min-h-[70vh] grid-cols-1 lg:grid-cols-[410px_minmax(0,1fr)]">
          <div className="border-b border-border/70 bg-muted/20 p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-5">
              <div className="rounded-3xl border border-border/70 bg-background/85 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{t('theme.editor.preview.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('theme.editor.preview.description')}</p>
                  </div>
                  {isCustomThemeActive ? (
                    <Badge className="border-primary/20 bg-primary/12 text-primary hover:bg-primary/12">
                      {t('theme.editor.preview.active')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t('theme.editor.preview.inactive')}</Badge>
                  )}
                </div>

                <div className="rounded-3xl border border-border/80 bg-card p-4 text-card-foreground shadow-[0_12px_40px_-18px_hsl(var(--foreground)/0.3)]">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-none">{t('theme.editor.preview.cardTitle')}</p>
                      <div className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                        {t('theme.editor.preview.primaryBadge')}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t('theme.editor.preview.cardDescription')}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex h-11 items-center justify-center rounded-2xl border border-border bg-secondary px-3 text-center text-[11px] font-medium leading-none text-secondary-foreground">
                        {t('theme.editor.preview.secondary')}
                      </div>
                      <div className="flex h-11 items-center justify-center rounded-2xl border border-border bg-muted px-3 text-center text-[11px] font-medium leading-none text-muted-foreground">
                        {t('theme.editor.preview.muted')}
                      </div>
                      <div className="flex h-11 items-center justify-center rounded-2xl border border-border bg-accent px-3 text-center text-[11px] font-medium leading-none text-accent-foreground">
                        {t('theme.editor.preview.accent')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/85 p-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold">{t('theme.editor.baseTheme.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('theme.editor.baseTheme.description')}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {baseThemeButtons.map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      className={cn(
                        'justify-start shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                        snapshotTheme.baseTheme === value
                          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                          : 'hover:bg-accent/80'
                      )}
                      onClick={() => handleBaseThemeChange(value)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="justify-start"
                    onClick={() => handleResetTheme(snapshotTheme.baseTheme)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('theme.editor.actions.resetCurrent')}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-10 justify-center whitespace-normal px-3 py-2 text-center leading-snug"
                      onClick={() => handleResetTheme('dark')}
                    >
                      {t('theme.editor.actions.useDarkPreset')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-10 justify-center whitespace-normal px-3 py-2 text-center leading-snug"
                      onClick={() => handleResetTheme('light')}
                    >
                      {t('theme.editor.actions.useLightPreset')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/85 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Palette className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t('theme.editor.note.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t('theme.editor.note.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="custom-scrollbar overflow-y-auto p-5">
            <div className="space-y-6">
              {CUSTOM_THEME_SECTIONS.map((section, index) => (
                <section key={section.titleKey} className="space-y-4">
                  {index > 0 && <Separator />}
                  <div>
                    <h3 className="text-base font-semibold">{t(section.titleKey)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t(section.descriptionKey)}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {section.colorKeys.map((colorKey) => (
                      <ThemeColorControl
                        key={colorKey}
                        colorKey={colorKey}
                        value={snapshotTheme.colors[colorKey]}
                        onPreviewColorChange={handlePreviewColorChange}
                        onCommitColorChange={handleCommitColorChange}
                        t={t}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
