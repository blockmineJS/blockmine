import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    needsSetup: null,
    checkingAuth: true,

    checkAuth: async () => {
        try {
            const res = await fetch('/api/auth/needs-setup');
            if (res.ok) {
                const data = await res.json();
                if (data.setupNeeded) {
                    return set({ needsSetup: true, checkingAuth: false, isAuthenticated: false });
                }
            }
        } catch (err) {
            console.error('Failed to check setup state:', err);
        }
        const token = localStorage.getItem('token');
        if (!token) {
            return set({ token: null, isAuthenticated: false, checkingAuth: false, needsSetup: false });
        }
        try {
            const res = await fetch('/api/version', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                set({ token, isAuthenticated: true, checkingAuth: false, needsSetup: false });
            } else {
                localStorage.removeItem('token');
                set({ token: null, isAuthenticated: false, checkingAuth: false, needsSetup: false });
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            set({ token: null, isAuthenticated: false, checkingAuth: false, needsSetup: false });
        }
    },

    login: async (username, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        localStorage.setItem('token', data.token);
        set({ token: data.token, isAuthenticated: true });
    },

    setup: async (username, password) => {
        const res = await fetch('/api/auth/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Setup failed');
        localStorage.setItem('token', data.token);
        set({ token: data.token, isAuthenticated: true, needsSetup: false });
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ token: null, isAuthenticated: false });
    }
}));
