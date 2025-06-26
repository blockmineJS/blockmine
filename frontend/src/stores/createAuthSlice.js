import { apiHelper } from '@/lib/api';

export const createAuthSlice = (set, get) => ({
    token: localStorage.getItem('authToken') || null,
    user: null,
    isAuthenticated: false,
    needsSetup: false,
    authInitialized: false,

    hasPermission: (permission) => {
        if (!permission) return true;
        const userPermissions = get().user?.permissions || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
    },

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
            if (error.message.includes('Невалидный токен') || error.message.includes('Нет токена')) {
                 localStorage.removeItem('authToken');
            }
            set({ isAuthenticated: false, token: null, user: null });
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
        set({ token: data.token, user: data.user, isAuthenticated: true });
        get().connectSocket(); 
    },

    setupAdmin: async (username, password) => {
        const data = await apiHelper('/api/auth/setup', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        
        localStorage.setItem('authToken', data.token);
        set({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            needsSetup: false
        });
        get().connectSocket();
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