
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
        const currentSocket = get().socket;
        if (currentSocket && (currentSocket.connected || currentSocket.connecting)) {
            console.log("[Socket] Подключение уже в процессе или установлено. Новое не создается.");
            return;
        }

        if (currentSocket) {
            currentSocket.disconnect();
        }

        const token = get().token;
        if (!token) {
            console.log("[Socket] Подключение отложено: нет токена.");
            return;
        }

        const socketUrl = 'http://localhost:3001';

        console.log(`[Socket] Попытка подключения к: ${socketUrl}`);

        const newSocket = io(socketUrl, {
            path: "/socket.io/",
            auth: { token },
            reconnection: true,
            transports: ['websocket'], 
        });
        
        newSocket.on('connect', () => console.log('Socket.IO подключен:', newSocket.id));
        newSocket.on('disconnect', (reason) => console.log('Socket.IO отключен:', reason));
        newSocket.on('connect_error', (err) => {
            console.warn(`[Socket] Ошибка подключения (попытка переподключения): ${err.message}`);
        });

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
            const newLog = (typeof log === 'object' && log !== null && log.id) 
                ? log 
                : { id: Date.now() + Math.random(), content: (typeof log === 'object' && log !== null ? JSON.stringify(log) : log) };
            
            const newLogs = [...currentLogs, newLog];

            const uniqueLogs = Array.from(new Map(newLogs.map(item => [item.id, item])).values());

            state.botLogs[botId] = uniqueLogs.slice(-500);
        });
    },

});