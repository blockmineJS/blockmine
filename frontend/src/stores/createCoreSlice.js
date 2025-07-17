import { io } from 'socket.io-client';
import { apiHelper } from '@/lib/api';


const normalizeAndIdempotentLog = (log, index = 0) => {
    const now = Date.now();
    const random = Math.random();

    if (typeof log !== 'object' || log === null) {
        return {
            id: `gen-primitive-${now}-${index}-${random}`,
            content: log,
            timestamp: now
        };
    }

    const id = log.id || `gen-object-${log.timestamp || now}-${index}-${random}`;

    const timestamp = log.timestamp || now;

    if (log.content !== undefined) {
        return { id, content: log.content, timestamp };
    }

    return { id, content: JSON.stringify(log), timestamp };
};


export const createCoreSlice = (set, get) => ({
    socket: null,
    bots: [],
    servers: [],
    botStatuses: {},
    botLogs: {},
    resourceUsage: {},
    appVersion: '',
    botUIExtensions: {},
    changelog: '',
    showChangelogDialog: false,

    connectSocket: () => {
        const existingSocket = get().socket;
        if (existingSocket && (existingSocket.connected || existingSocket.connecting)) {
            console.log('[Socket] Соединение уже установлено или в процессе.');
            return;
        }

        const token = get().token;
        if (!token) {
            console.log('[Socket] Подключение отложено, нет токена.');
            return;
        }

        const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;

        const newSocket = io(SOCKET_URL, {
            path: "/socket.io/",
            auth: { token },
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => console.log('Socket.IO подключен:', newSocket.id));
        newSocket.on('disconnect', (reason) => console.log('Socket.IO отключен:', reason));
        newSocket.on('connect_error', (err) => console.warn(`[Socket] Ошибка подключения: ${err.message}`));

        newSocket.on('bot:status', ({ botId, status, message }) => {
            set(state => {
                state.botStatuses[botId] = status;
            });
            if (message) get().appendLog(botId, `[SYSTEM] ${message}`);
        });

        newSocket.on('bot:log', ({ botId, log }) => get().appendLog(botId, log));

        newSocket.on('bots:usage', (usageData) => {
            const usageMap = usageData.reduce((acc, usage) => ({ ...acc, [usage.botId]: usage }), {});
            set({ resourceUsage: usageMap });
        });

        set({ socket: newSocket });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket) {
            socket.disconnect();
            set({ socket: null });
        }
    },

    fetchInitialData: async () => {
        try {
            console.log('[fetchInitialData] Начинаем загрузку начальных данных');
            const [botsData, serversData, stateData, versionData] = await Promise.all([
                apiHelper('/api/bots'),
                apiHelper('/api/servers'),
                apiHelper('/api/bots/state'),
                apiHelper('/api/version')
            ]);

            const currentVersion = versionData.version || '';
            const lastShownVersion = localStorage.getItem('lastShownVersion');
            
            console.log('[fetchInitialData] Версия:', currentVersion, 'Последняя показанная:', lastShownVersion);
            
                if (currentVersion && currentVersion !== lastShownVersion) {
                    console.log('[fetchInitialData] Новая версия обнаружена! Загружаем changelog');
                    await get().fetchChangelog();
                    set({ showChangelogDialog: true });
                    localStorage.setItem('lastShownVersion', currentVersion);
                }

            set(state => {
                const serverLogs = stateData.logs || {};
                const newBotLogs = { ...state.botLogs };

                for (const botId in serverLogs) {
                    const clientLogs = state.botLogs[botId] || [];
                    const serverLogsForBot = serverLogs[botId] || [];

                    const combinedLogs = [...clientLogs, ...serverLogsForBot].map(normalizeAndIdempotentLog);

                    const uniqueLogs = Array.from(new Map(combinedLogs.map(log => [log.id, log])).values());

                    newBotLogs[botId] = uniqueLogs.slice(-1000);
                }

                return {
                    ...state,
                    bots: botsData || [],
                    servers: serversData || [],
                    botStatuses: stateData.statuses || {},
                    appVersion: currentVersion,
                    botLogs: newBotLogs
                };
            });
        } catch (error) {
             console.error("Не удалось загрузить начальные данные:", error.message);
             set(state => ({
                 ...state,
                 bots: [],
                 servers: [],
                 botStatuses: {},
                 appVersion: ''
             }));
        }
    },

    fetchUIExtensions: async (botId) => {
        try {
            const extensions = await apiHelper(`/api/bots/${botId}/ui-extensions`);
            set(state => {
                state.botUIExtensions[botId] = extensions;
            });
        } catch (error) {
            console.error(`Не удалось загрузить UI расширения для бота ${botId}:`, error);
            set(state => {
                state.botUIExtensions[botId] = [];
            });
        }
    },

    appendLog: (botId, log) => {
        set(state => {
            const newLog = normalizeAndIdempotentLog(log);

            const currentLogs = state.botLogs[botId] || [];

            const logExists = currentLogs.some(l => l.id === newLog.id);
            if (logExists) {
                return;
            }

            const newLogs = [...currentLogs, newLog];
            const limitedLogs = newLogs.length > 2000 ? newLogs.slice(-2000) : newLogs;

            state.botLogs[botId] = limitedLogs;
        });
    },

    fetchChangelog: async () => {
        try {
            console.log('[fetchChangelog] Загружаем changelog с /api/changelog');
            const response = await fetch('/api/changelog');
            if (!response.ok) {
                throw new Error('Failed to fetch changelog');
            }
            const text = await response.text();
            console.log('[fetchChangelog] Получен changelog:', text.substring(0, 100) + '...');
            set({ changelog: text });
        } catch (error) {
            console.error('Не удалось загрузить changelog:', error);
            set({ changelog: '' });
        }
    },

    closeChangelogDialog: () => {
        set({ showChangelogDialog: false });
    },
});