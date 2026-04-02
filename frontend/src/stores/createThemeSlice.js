import {
  applyThemeToDocument,
  CUSTOM_THEME_STORAGE_KEY,
  getDefaultCustomTheme,
  loadStoredCustomTheme,
  resolveRenderedTheme,
  sanitizeCustomTheme,
  THEME_STORAGE_KEY,
} from '@/lib/themeUtils';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'system';
  }

  return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
};

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

  return {
    theme: initialTheme,
    resolvedTheme: resolveRenderedTheme(initialTheme, initialCustomTheme),
    customTheme: initialCustomTheme,

    setTheme: (theme) => {
      const normalizedTheme = ['light', 'dark', 'system', 'custom'].includes(theme) ? theme : 'system';
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
