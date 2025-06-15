import { toast } from '@/hooks/use-toast';
import { io } from 'socket.io-client';

export const createCoreSlice = (set, get) => ({
    socket: null,
    bots: [],
    servers: [],
    botStatuses: {},
    botLogs: {},
    resourceUsage: {},
    appVersion: '',

    connectSocket: () => {
        if (get().socket) return;
        const socket = io('http://localhost:3001');
        socket.on('connect', () => console.log('Socket.IO подключен:', socket.id));
        socket.on('disconnect', () => console.log('Socket.IO отключен'));
        socket.on('bot:status', ({ botId, status, message }) => {
            set(state => { state.botStatuses[botId] = status; });
            if (message) get().appendLog(botId, `[SYSTEM] ${message}`);
        });
        socket.on('bot:log', ({ botId, log }) => get().appendLog(botId, log));
        socket.on('bots:usage', (usageData) => {
            const usageMap = usageData.reduce((acc, usage) => ({ ...acc, [usage.botId]: usage }), {});
            set({ resourceUsage: usageMap });
        });
        set({ socket });
    },

    fetchInitialData: async () => {
        try {
            const [botsRes, serversRes, stateRes, versionRes] = await Promise.all([
                fetch('/api/bots'), fetch('/api/servers'), fetch('/api/bots/state'), fetch('/api/version')
            ]);
            const botsData = await botsRes.json();
            const serversData = await serversRes.json();
            const stateData = await stateRes.json();
            if (!botsRes.ok || !Array.isArray(botsData)) throw new Error(botsData.error || 'Ошибка загрузки ботов');
            if (!serversRes.ok || !Array.isArray(serversData)) throw new Error(serversData.error || 'Ошибка загрузки серверов');
            let version = '';
            if (versionRes.ok) version = (await versionRes.json()).version;
            set(state => {
                state.bots = botsData;
                state.servers = serversData;
                state.botStatuses = stateData.statuses || {};
                state.botLogs = stateData.logs || {};
                state.appVersion = version;
            });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Ошибка сети', description: error.message });
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