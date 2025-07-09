// frontend/src/stores/createThemeSlice.js

export const createThemeSlice = (set) => ({
    theme: localStorage.getItem('blockmine-theme') || 'system',
    
    setTheme: (theme) => {
        const root = window.document.documentElement;

        root.classList.remove('light', 'dark');

        let systemTheme = 'light';
        if (theme === 'system') {
            systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        localStorage.setItem('blockmine-theme', theme);
        set({ theme });
    },
}); 