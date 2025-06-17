import { io } from 'socket.io-client';
import { apiHelper } from '@/lib/api';

export const createCoreSlice = (set, get) => ({
    socket: null,
    bots: [],
    servers: [],
    botStatuses: {},
    botLogs: {},
    resourceUsage: {},
    appVersion: '',

    connectSocket: () => {
        if (get().socket) {
            get().socket.disconnect();
        }
        const token = get().token;
        if (!token) {
            console.log("[Socket] Подключение отложено: нет токена.");
            return;
        }
        const newSocket = io('http://localhost:3001', {
            auth: { token }
        });
        newSocket.on('connect', () => console.log('Socket.IO подключен:', newSocket.id));
        newSocket.on('disconnect', () => console.log('Socket.IO отключен'));
        newSocket.on('bot:status', ({ botId, status, message }) => {
            set(state => { state.botStatuses[botId] = status; });
            if (message) get().appendLog(botId, `[SYSTEM] ${message}`);
        });
        newSocket.on('bot:log', ({ botId, log }) => get().appendLog(botId, log));
        newSocket.on('bots:usage', (usageData) => {
            const usageMap = usageData.reduce((acc, usage) => ({ ...acc, [usage.botId]: usage }), {});
            set({ resourceUsage: usageMap });
        });
        set({ socket: newSocket });
    },

    fetchInitialData: async () => {
        try {
            const [botsData, serversData, stateData, versionData] = await Promise.all([
                apiHelper('/api/bots'),
                apiHelper('/api/servers'),
                apiHelper('/api/bots/state'),
                apiHelper('/api/version')
            ]);
            
            set(state => {
                state.bots = botsData || [];
                state.servers = serversData || [];
                state.botStatuses = stateData.statuses || {};
                state.botLogs = stateData.logs || {};
                state.appVersion = versionData.version || '';
            });
        } catch (error) {
             console.error("Не удалось загрузить начальные данные:", error.message);
             set(state => { state.bots = []; state.servers = []; });
        }
    },

    appendLog: (botId, log) => {
        set(state => {
            const currentLogs = state.botLogs[botId] || [];
            state.botLogs[botId] = [...currentLogs, log].slice(-200); 
        });
    },
});