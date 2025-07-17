import React, { useEffect, useState } from 'react';
import { createTheme, ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material/styles';
import { RouterProvider } from 'react-router-dom';
import { toast } from 'sonner';
import { router } from './router';
import { useAppStore } from '@/stores/appStore';
import ToggleButton from '@mui/material/ToggleButton';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ChangelogDialog from '@/components/ChangelogDialog';

const getInitialDarkMode = () => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return storedTheme === 'dark' || (storedTheme === null && prefersDark);
};

function App() {
    const [darkMode, setDarkMode] = useState(getInitialDarkMode);
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const theme = createTheme({
        palette: {
            mode: darkMode ? 'dark' : prefersDarkMode ? 'dark' : 'light',
            primary: {
                main: '#1976d2',
            },
            secondary: {
                main: '#dc004e',
            },
        },
    });

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const checkAuth = useAppStore(state => state.checkAuth);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
                <ToggleButton
                    value="theme-toggle"
                    selected={darkMode}
                    onChange={toggleDarkMode}
                >
                    {darkMode ? <WbSunnyIcon /> : <DarkModeIcon />}
                </ToggleButton>
            </div>
            <RouterProvider router={router} />
            <ChangelogDialog />
        </ThemeProvider>
    );
}

export default App;
