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
    proxies: [],
    botStatuses: {},
    botLogs: {},
    resourceUsage: {},
    appVersion: '',
    botUIExtensions: {},
    changelog: '',
    changelogFetchedAt: 0,
    showChangelogDialog: false,
    isChangelogLoading: false,
    panelUpdate: null,
    panelUpdateProgress: null,
    showPanelUpdateDialog: false,
    panelUpdateChecking: false,
    panelUpdateApplying: false,
    panelUpdateWaiting: false,

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

        newSocket.on('panel:update', (payload) => {
            const stage = payload?.stage || '';
            const applying = stage !== '' && stage !== 'idle' && stage !== 'done' && stage !== 'error';
            set({
                panelUpdateProgress: payload,
                panelUpdateApplying: applying,
                panelUpdateWaiting: stage === 'restarting' ? true : get().panelUpdateWaiting,
                showPanelUpdateDialog: stage === 'restarting' ? true : get().showPanelUpdateDialog,
            });
        });

        set({ socket: newSocket });
    },
    disconnectSocket: () => {
        const s = get().socket;
        try { s?.disconnect(); } catch (e) {}
        set({ socket: null });
    },

    fetchInitialData: async () => {
        try {
            const [botsData, serversData, proxiesData, stateData, versionData] = await Promise.all([
                apiHelper('/api/bots'),
                apiHelper('/api/servers'),
                apiHelper('/api/proxies'),
                apiHelper('/api/bots/state'),
                apiHelper('/api/version')
            ]);

            const currentVersion = versionData.version || '';
            const lastShownVersion = localStorage.getItem('lastShownVersion');
            await get().fetchPanelUpdate();
            const updateInfo = get().panelUpdate;
            const dismissedSha = localStorage.getItem('panelUpdateDismissedSha') || '';
            const shouldShowUpdate = Boolean(
                sessionStorage.getItem('blockmine-panel-updating')
                || (
                    updateInfo?.updateAvailable
                    && updateInfo?.latest?.sha
                    && updateInfo.latest.sha !== dismissedSha
                )
            );

            set(state => {
                const serverLogs = stateData.logs || {};
                const newBotLogs = { ...state.botLogs };

                for (const botId in serverLogs) {
                    const clientLogs = state.botLogs[botId] || [];
                    const serverLogsForBot = serverLogs[botId] || [];

                    const combinedLogs = [...clientLogs, ...serverLogsForBot].map(normalizeAndIdempotentLog);

                    const uniqueLogs = Array.from(new Map(combinedLogs.map(log => [log.id, log])).values());

                    newBotLogs[botId] = uniqueLogs.slice(-200);
                }

                return {
                    ...state,
                    bots: botsData || [],
                    servers: serversData?.items || [],
                    proxies: proxiesData?.items || [],
                    botStatuses: stateData.statuses || {},
                    appVersion: currentVersion,
                    botLogs: newBotLogs,
                    showPanelUpdateDialog: shouldShowUpdate ? true : state.showPanelUpdateDialog,
                };
            });

            if (!shouldShowUpdate && currentVersion && currentVersion !== lastShownVersion) {
                await get().openChangelogDialog();
            }
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
            const limitedLogs = newLogs.length > 500 ? newLogs.slice(-500) : newLogs;

            state.botLogs[botId] = limitedLogs;
        });
    },

    updateBotOrder: (newBotsOrder) => {
        set(state => {
            state.bots = newBotsOrder;
        });
    },

    fetchChangelog: async () => {
        if (get().isChangelogLoading) {
            return;
        }

        try {
            set({ isChangelogLoading: true });
            const response = await fetch('/api/changelog');
            if (!response.ok) {
                throw new Error('Failed to fetch changelog');
            }
            const text = await response.text();
            set({ changelog: text, changelogFetchedAt: Date.now() });
        } catch (error) {
            console.error('Не удалось загрузить changelog:', error);
            set({ changelog: '', changelogFetchedAt: 0 });
        } finally {
            set({ isChangelogLoading: false });
        }
    },

    openChangelogDialog: async () => {
        const now = Date.now();
        const fetchedAt = get().changelogFetchedAt || 0;
        const hasFreshChangelog = get().changelog && (now - fetchedAt) < 5 * 60 * 1000;

        set({ showChangelogDialog: true });

        if (!hasFreshChangelog) {
            get().fetchChangelog();
        }
    },

    closeChangelogDialog: () => {
        const currentVersion = get().appVersion;
        if (currentVersion) {
            localStorage.setItem('lastShownVersion', currentVersion);
        }
        set({ showChangelogDialog: false });
    },

    setShowChangelogDialog: (show) => {
        if (!show) {
            get().closeChangelogDialog();
            return;
        }

        set({ showChangelogDialog: true });
    },

    fetchPanelUpdate: async (force = false) => {
        if (get().panelUpdateChecking) {
            return get().panelUpdate;
        }
        try {
            set({ panelUpdateChecking: true });
            const data = await apiHelper(`/api/panel/update/check${force ? '?fresh=1' : ''}`);
            if (!data?.applying && sessionStorage.getItem('blockmine-panel-updating') && !data?.updateAvailable) {
                sessionStorage.removeItem('blockmine-panel-updating');
            }
            set({
                panelUpdate: data,
                panelUpdateChecking: false,
                panelUpdateApplying: Boolean(data?.applying),
            });
            return data;
        } catch (error) {
            console.error('Не удалось проверить обновления панели:', error);
            set({ panelUpdateChecking: false });
            return get().panelUpdate;
        }
    },

    openPanelUpdateDialog: async () => {
        set({ showPanelUpdateDialog: true });
        if (!get().panelUpdate) {
            await get().fetchPanelUpdate();
        }
    },

    closePanelUpdateDialog: () => {
        const latestSha = get().panelUpdate?.latest?.sha;
        if (latestSha) {
            localStorage.setItem('panelUpdateDismissedSha', latestSha);
        }
        set({ showPanelUpdateDialog: false });
    },

    setShowPanelUpdateDialog: (show) => {
        if (!show) {
            if (get().panelUpdateApplying || get().panelUpdateWaiting) {
                return;
            }
            get().closePanelUpdateDialog();
            return;
        }
        set({ showPanelUpdateDialog: true });
    },

    applyPanelUpdate: async () => {
        try {
            set({ panelUpdateApplying: true, showPanelUpdateDialog: true });
            await apiHelper('/api/panel/update/apply', { method: 'POST' });
        } catch (error) {
            set({ panelUpdateApplying: false });
            throw error;
        }
    },

    setPanelUpdateWaiting: (waiting) => {
        set({ panelUpdateWaiting: Boolean(waiting) });
    },
});
