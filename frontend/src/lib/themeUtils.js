export const THEME_STORAGE_KEY = 'blockmine-theme';
export const CUSTOM_THEME_STORAGE_KEY = 'blockmine-custom-theme';

export const CUSTOM_THEME_COLOR_FIELDS = {
  background: { cssVar: 'background', labelKey: 'theme.editor.colors.background.label', descriptionKey: 'theme.editor.colors.background.description' },
  foreground: { cssVar: 'foreground', labelKey: 'theme.editor.colors.foreground.label', descriptionKey: 'theme.editor.colors.foreground.description' },
  card: { cssVar: 'card', labelKey: 'theme.editor.colors.card.label', descriptionKey: 'theme.editor.colors.card.description' },
  cardForeground: { cssVar: 'card-foreground', labelKey: 'theme.editor.colors.cardForeground.label', descriptionKey: 'theme.editor.colors.cardForeground.description' },
  popover: { cssVar: 'popover', labelKey: 'theme.editor.colors.popover.label', descriptionKey: 'theme.editor.colors.popover.description' },
  popoverForeground: { cssVar: 'popover-foreground', labelKey: 'theme.editor.colors.popoverForeground.label', descriptionKey: 'theme.editor.colors.popoverForeground.description' },
  primary: { cssVar: 'primary', labelKey: 'theme.editor.colors.primary.label', descriptionKey: 'theme.editor.colors.primary.description' },
  primaryForeground: { cssVar: 'primary-foreground', labelKey: 'theme.editor.colors.primaryForeground.label', descriptionKey: 'theme.editor.colors.primaryForeground.description' },
  secondary: { cssVar: 'secondary', labelKey: 'theme.editor.colors.secondary.label', descriptionKey: 'theme.editor.colors.secondary.description' },
  secondaryForeground: { cssVar: 'secondary-foreground', labelKey: 'theme.editor.colors.secondaryForeground.label', descriptionKey: 'theme.editor.colors.secondaryForeground.description' },
  muted: { cssVar: 'muted', labelKey: 'theme.editor.colors.muted.label', descriptionKey: 'theme.editor.colors.muted.description' },
  mutedForeground: { cssVar: 'muted-foreground', labelKey: 'theme.editor.colors.mutedForeground.label', descriptionKey: 'theme.editor.colors.mutedForeground.description' },
  accent: { cssVar: 'accent', labelKey: 'theme.editor.colors.accent.label', descriptionKey: 'theme.editor.colors.accent.description' },
  accentForeground: { cssVar: 'accent-foreground', labelKey: 'theme.editor.colors.accentForeground.label', descriptionKey: 'theme.editor.colors.accentForeground.description' },
  border: { cssVar: 'border', labelKey: 'theme.editor.colors.border.label', descriptionKey: 'theme.editor.colors.border.description' },
  input: { cssVar: 'input', labelKey: 'theme.editor.colors.input.label', descriptionKey: 'theme.editor.colors.input.description' },
  ring: { cssVar: 'ring', labelKey: 'theme.editor.colors.ring.label', descriptionKey: 'theme.editor.colors.ring.description' },
  graphHeader: { cssVar: 'graph-header', labelKey: 'theme.editor.colors.graphHeader.label', descriptionKey: 'theme.editor.colors.graphHeader.description' },
  graphSurface: { cssVar: 'graph-surface', labelKey: 'theme.editor.colors.graphSurface.label', descriptionKey: 'theme.editor.colors.graphSurface.description' },
  graphInput: { cssVar: 'graph-input', labelKey: 'theme.editor.colors.graphInput.label', descriptionKey: 'theme.editor.colors.graphInput.description' },
  scrollbarThumb: { cssVar: 'scrollbar-thumb', labelKey: 'theme.editor.colors.scrollbarThumb.label', descriptionKey: 'theme.editor.colors.scrollbarThumb.description' },
  scrollbarThumbHover: { cssVar: 'scrollbar-thumb-hover', labelKey: 'theme.editor.colors.scrollbarThumbHover.label', descriptionKey: 'theme.editor.colors.scrollbarThumbHover.description' },
  scrollbarButtonBg: { cssVar: 'scrollbar-button-bg', labelKey: 'theme.editor.colors.scrollbarButtonBg.label', descriptionKey: 'theme.editor.colors.scrollbarButtonBg.description' },
};

export const CUSTOM_THEME_SECTIONS = [
  {
    titleKey: 'theme.editor.sections.surface.title',
    descriptionKey: 'theme.editor.sections.surface.description',
    colorKeys: ['background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground'],
  },
  {
    titleKey: 'theme.editor.sections.brand.title',
    descriptionKey: 'theme.editor.sections.brand.description',
    colorKeys: ['primary', 'primaryForeground', 'ring'],
  },
  {
    titleKey: 'theme.editor.sections.ui.title',
    descriptionKey: 'theme.editor.sections.ui.description',
    colorKeys: ['secondary', 'secondaryForeground', 'muted', 'mutedForeground', 'accent', 'accentForeground', 'border', 'input'],
  },
  {
    titleKey: 'theme.editor.sections.graphEditor.title',
    descriptionKey: 'theme.editor.sections.graphEditor.description',
    colorKeys: ['graphHeader', 'graphSurface', 'graphInput'],
  },
  {
    titleKey: 'theme.editor.sections.scrollbar.title',
    descriptionKey: 'theme.editor.sections.scrollbar.description',
    colorKeys: ['scrollbarThumb', 'scrollbarThumbHover', 'scrollbarButtonBg'],
  },
];

const DARK_PRESET_COLORS = {
  background: '#09090B',
  foreground: '#FAFAFA',
  card: '#141418',
  cardForeground: '#FAFAFA',
  popover: '#141418',
  popoverForeground: '#FAFAFA',
  primary: '#7C3AED',
  primaryForeground: '#FFFFFF',
  secondary: '#27272A',
  secondaryForeground: '#FAFAFA',
  muted: '#27272A',
  mutedForeground: '#A1A1AA',
  accent: '#27272A',
  accentForeground: '#FAFAFA',
  border: '#27272A',
  input: '#27272A',
  ring: '#7C3AED',
  graphHeader: '#334155',
  graphSurface: '#1E293B',
  graphInput: '#0F172A',
  scrollbarThumb: '#4D4D55',
  scrollbarThumbHover: '#75757F',
  scrollbarButtonBg: '#27272A',
};

const LIGHT_PRESET_COLORS = {
  background: '#FFFFFF',
  foreground: '#09090B',
  card: '#FAFAFA',
  cardForeground: '#09090B',
  popover: '#FFFFFF',
  popoverForeground: '#09090B',
  primary: '#7C3AED',
  primaryForeground: '#FFFFFF',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  muted: '#F4F4F5',
  mutedForeground: '#71717A',
  accent: '#F4F4F5',
  accentForeground: '#18181B',
  border: '#E4E4E7',
  input: '#E4E4E7',
  ring: '#7C3AED',
  graphHeader: '#334155',
  graphSurface: '#1E293B',
  graphInput: '#0F172A',
  scrollbarThumb: '#AFAFBA',
  scrollbarThumbHover: '#81818B',
  scrollbarButtonBg: '#F4F4F5',
};

export const BUILT_IN_THEME_PRESETS = {
  dark: {
    baseTheme: 'dark',
    colors: DARK_PRESET_COLORS,
  },
  light: {
    baseTheme: 'light',
    colors: LIGHT_PRESET_COLORS,
  },
};

const CUSTOM_THEME_VARIABLES = Object.values(CUSTOM_THEME_COLOR_FIELDS).map((field) => field.cssVar);

function clonePreset(baseTheme = 'dark') {
  const preset = BUILT_IN_THEME_PRESETS[baseTheme] || BUILT_IN_THEME_PRESETS.dark;
  return {
    baseTheme: preset.baseTheme,
    colors: { ...preset.colors },
  };
}

export function normalizeHexColor(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!/^#([\da-fA-F]{3}|[\da-fA-F]{6})$/.test(withHash)) {
    return null;
  }

  if (withHash.length === 4) {
    return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toUpperCase();
  }

  return withHash.toUpperCase();
}

export function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHslChannels({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return `${hue} ${(saturation * 100).toFixed(1)}% ${(lightness * 100).toFixed(1)}%`;
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return { h: 0, s: 0, l: 0 };
  }

  const red = rgb.r / 255;
  const green = rgb.g / 255;
  const blue = rgb.b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

export function hslToHex({ h, s, l }) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(100, Number(s))) / 100;
  const lightness = Math.max(0, Math.min(100, Number(l))) / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) [red, green, blue] = [chroma, x, 0];
  else if (segment >= 1 && segment < 2) [red, green, blue] = [x, chroma, 0];
  else if (segment >= 2 && segment < 3) [red, green, blue] = [0, chroma, x];
  else if (segment >= 3 && segment < 4) [red, green, blue] = [0, x, chroma];
  else if (segment >= 4 && segment < 5) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  const match = lightness - chroma / 2;
  const toHex = (value) => Math.round((value + match) * 255).toString(16).padStart(2, '0');

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase();
}

function applyCustomThemeVariables(root, customTheme) {
  Object.entries(CUSTOM_THEME_COLOR_FIELDS).forEach(([key, field]) => {
    const color = customTheme.colors[key];
    const rgb = hexToRgb(color);
    if (!rgb) return;
    root.style.setProperty(`--${field.cssVar}`, rgbToHslChannels(rgb));
  });
}

function clearCustomThemeVariables(root) {
  CUSTOM_THEME_VARIABLES.forEach((cssVar) => {
    root.style.removeProperty(`--${cssVar}`);
  });
}

export function sanitizeCustomTheme(theme) {
  const fallbackBaseTheme = theme?.baseTheme === 'light' ? 'light' : 'dark';
  const fallback = clonePreset(fallbackBaseTheme);
  const nextColors = { ...fallback.colors };

  Object.keys(nextColors).forEach((colorKey) => {
    const normalized = normalizeHexColor(theme?.colors?.[colorKey]);
    if (normalized) {
      nextColors[colorKey] = normalized;
    }
  });

  return {
    baseTheme: fallbackBaseTheme,
    colors: nextColors,
  };
}

export function getDefaultCustomTheme(baseTheme = 'dark') {
  return clonePreset(baseTheme);
}

export function loadStoredCustomTheme() {
  if (typeof window === 'undefined') {
    return clonePreset('dark');
  }

  try {
    const stored = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    if (!stored) {
      return clonePreset('dark');
    }

    return sanitizeCustomTheme(JSON.parse(stored));
  } catch {
    return clonePreset('dark');
  }
}

export function resolveRenderedTheme(theme, customTheme) {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  if (theme === 'custom') {
    return sanitizeCustomTheme(customTheme).baseTheme;
  }

  return theme === 'dark' ? 'dark' : 'light';
}

export function applyThemeToDocument(theme, customTheme) {
  if (typeof window === 'undefined') {
    return resolveRenderedTheme(theme, customTheme);
  }

  const root = window.document.documentElement;
  const resolvedTheme = resolveRenderedTheme(theme, customTheme);

  root.classList.remove('light', 'dark');
  clearCustomThemeVariables(root);
  root.classList.add(resolvedTheme);
  root.dataset.themeMode = theme;

  if (theme === 'custom') {
    applyCustomThemeVariables(root, sanitizeCustomTheme(customTheme));
  }

  return resolvedTheme;
}

export function applyCustomThemePreviewToDocument(customTheme) {
  if (typeof window === 'undefined') {
    return;
  }

  const root = window.document.documentElement;
  const sanitizedTheme = sanitizeCustomTheme(customTheme);

  root.classList.remove('light', 'dark');
  root.classList.add(sanitizedTheme.baseTheme);
  root.dataset.themeMode = 'custom';
  clearCustomThemeVariables(root);
  applyCustomThemeVariables(root, sanitizedTheme);
}

export function getThemeMenuSwatch(theme, customTheme) {
  if (theme === 'custom') {
    return sanitizeCustomTheme(customTheme).colors.primary;
  }

  return (BUILT_IN_THEME_PRESETS[theme] || BUILT_IN_THEME_PRESETS.dark).colors.primary;
}

export function parseColorInput(value, fallback) {
  return normalizeHexColor(value) || fallback;
}
