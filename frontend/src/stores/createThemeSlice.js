import {
  applyThemeToDocument,
  CUSTOM_THEME_STORAGE_KEY,
  DEFAULT_THEME,
  getDefaultCustomTheme,
  loadStoredCustomTheme,
  readStoredThemeMode,
  resolveRenderedTheme,
  sanitizeCustomTheme,
  THEME_MODES,
  THEME_STORAGE_KEY,
} from '@/lib/themeUtils';

const getInitialTheme = () => readStoredThemeMode();

const persistCustomTheme = (customTheme) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customTheme));
};

const persistThemeMode = (theme) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const createThemeSlice = (set, get) => {
  const initialTheme = getInitialTheme();
  const initialCustomTheme = loadStoredCustomTheme();
  const initialResolvedTheme = applyThemeToDocument(initialTheme, initialCustomTheme);

  return {
    theme: initialTheme,
    resolvedTheme: initialResolvedTheme,
    customTheme: initialCustomTheme,

    setTheme: (theme) => {
      const normalizedTheme = THEME_MODES.includes(theme) ? theme : DEFAULT_THEME;
      const customTheme = sanitizeCustomTheme(get().customTheme);
      const resolvedTheme = applyThemeToDocument(normalizedTheme, customTheme);

      persistThemeMode(normalizedTheme);
      set({
        theme: normalizedTheme,
        customTheme,
        resolvedTheme,
      });
    },

    setCustomThemeBaseTheme: (baseTheme) => {
      const nextBaseTheme = baseTheme === 'light' ? 'light' : 'dark';
      const current = sanitizeCustomTheme(get().customTheme);
      const nextTheme = {
        ...current,
        baseTheme: nextBaseTheme,
      };

      persistCustomTheme(nextTheme);

      const nextState = {
        customTheme: nextTheme,
        resolvedTheme: resolveRenderedTheme(get().theme, nextTheme),
      };

      if (get().theme === 'custom') {
        nextState.resolvedTheme = applyThemeToDocument('custom', nextTheme);
      }

      set(nextState);
    },

    updateCustomThemeColor: (colorKey, colorValue) => {
      if (!colorKey) {
        return;
      }

      const current = sanitizeCustomTheme(get().customTheme);
      const nextTheme = sanitizeCustomTheme({
        ...current,
        colors: {
          ...current.colors,
          [colorKey]: colorValue,
        },
      });

      persistCustomTheme(nextTheme);

      const nextState = {
        customTheme: nextTheme,
        resolvedTheme: resolveRenderedTheme(get().theme, nextTheme),
      };

      if (get().theme === 'custom') {
        nextState.resolvedTheme = applyThemeToDocument('custom', nextTheme);
      }

      set(nextState);
    },

    replaceCustomTheme: (customTheme) => {
      const nextTheme = sanitizeCustomTheme(customTheme);
      persistCustomTheme(nextTheme);

      const nextState = {
        customTheme: nextTheme,
        resolvedTheme: resolveRenderedTheme(get().theme, nextTheme),
      };

      if (get().theme === 'custom') {
        nextState.resolvedTheme = applyThemeToDocument('custom', nextTheme);
      }

      set(nextState);
    },

    resetCustomTheme: (baseTheme = 'dark') => {
      const nextTheme = getDefaultCustomTheme(baseTheme);
      persistCustomTheme(nextTheme);

      const nextState = {
        customTheme: nextTheme,
        resolvedTheme: resolveRenderedTheme(get().theme, nextTheme),
      };

      if (get().theme === 'custom') {
        nextState.resolvedTheme = applyThemeToDocument('custom', nextTheme);
      }

      set(nextState);
    },
  };
};
