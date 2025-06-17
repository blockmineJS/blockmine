import { apiHelper } from '@/lib/api';

export const createAuthSlice = (set, get) => ({
    token: localStorage.getItem('authToken') || null,
    user: null,
    isAuthenticated: false,
    needsSetup: false,
    authInitialized: false,

    initializeAuth: async () => {
        try {
            const status = await apiHelper('/api/auth/status');
            if (status.needsSetup) {
                set({ needsSetup: true, isAuthenticated: false, token: null, user: null });
                return;
            }
            set({ needsSetup: false });

            const token = get().token;
            if (token) {
                const userData = await apiHelper('/api/auth/me');
                set({ user: userData, isAuthenticated: true });
            } else {
                 set({ isAuthenticated: false, user: null, token: null });
            }
        } catch (error) {
            console.error("Auth initialization failed:", error.message);
            set({ isAuthenticated: false, token: null, user: null });
            localStorage.removeItem('authToken');
        } finally {
            set({ authInitialized: true });
        }
    },

    login: async (username, password) => {
        const data = await apiHelper('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        localStorage.setItem('authToken', data.token);
        get().connectSocket(); 
        set({ token: data.token, user: data.user, isAuthenticated: true });
    },

    setupAdmin: async (username, password) => {
        const data = await apiHelper('/api/auth/setup', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        
        localStorage.setItem('authToken', data.token);
        get().connectSocket();
        set({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            needsSetup: false
        });
    },
    
    logout: () => {
        const socket = get().socket;
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem('authToken');
        set({ token: null, user: null, isAuthenticated: false, socket: null });
    },
});