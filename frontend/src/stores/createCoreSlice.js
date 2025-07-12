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
            set(state => ({ botStatuses: { ...state.botStatuses, [botId]: status } }));
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
            const [botsData, serversData, stateData, versionData] = await Promise.all([
                apiHelper('/api/bots'),
                apiHelper('/api/servers'),
                apiHelper('/api/bots/state'),
                apiHelper('/api/version')
            ]);
            
            set(state => {
                const serverLogs = stateData.logs || {};
                const newBotLogs = { ...state.botLogs };
                
                for (const botId in serverLogs) {
                    const clientLogs = state.botLogs[botId] || [];
                    const serverLogsForBot = serverLogs[botId] || [];
                    
                    if (clientLogs.length === 0) {
                        newBotLogs[botId] = serverLogsForBot.slice(-500);
                    } else {
                        const allLogs = [...clientLogs, ...serverLogsForBot];
                        const uniqueLogs = allLogs.filter((log, index, self) => 
                            index === self.findIndex(l => l.id === log.id)
                        );
                        newBotLogs[botId] = uniqueLogs.slice(-500);
                    }
                }
                
                return {
                    ...state,
                    bots: botsData || [],
                    servers: serversData || [],
                    botStatuses: stateData.statuses || {},
                    appVersion: versionData.version || '',
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

    appendLog: (botId, log) => {
        set(state => {
            const currentLogs = state.botLogs[botId] || [];
            
            const newLog = (typeof log === 'object' && log !== null && log.id) 
                ? { ...log, timestamp: Date.now() }
                : { 
                    id: Date.now() + Math.random(), 
                    content: (typeof log === 'object' && log !== null ? JSON.stringify(log) : log),
                    timestamp: Date.now()
                };
            
            const lastLog = currentLogs[currentLogs.length - 1];
            if (lastLog && 
                lastLog.id === newLog.id) {
                return state;
            }
            
            const newLogs = [...currentLogs, newLog];
            
            const limitedLogs = newLogs.length > 500 ? newLogs.slice(-500) : newLogs;
            
            return {
                ...state,
                botLogs: {
                    ...state.botLogs,
                    [botId]: limitedLogs
                }
            };
        });
    },

});