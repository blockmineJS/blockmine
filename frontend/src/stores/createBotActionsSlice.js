
import { apiHelper } from '@/lib/api';

export const createBotActionsSlice = (set, get) => ({
    createBot: async (botData) => {
        const newBot = await apiHelper('/api/bots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(botData),
        }, "Новый бот успешно создан.");
        
        if (newBot) {
            await get().fetchInitialData();
        }
        return newBot;
    },

    startBot: async (botId) => {
        await apiHelper(`/api/bots/${botId}/start`, { method: 'POST' });
    },

    stopBot: async (botId) => {
        await apiHelper(`/api/bots/${botId}/stop`, { method: 'POST' });
    },

    restartBot: async (botId) => {
        await apiHelper(`/api/bots/${botId}/restart`, { method: 'POST' });
    },
    
    deleteBot: async (botId) => {
        await apiHelper(`/api/bots/${botId}`, { method: 'DELETE' }, "Бот успешно удален.");
        await get().fetchInitialData();
    },

    startAllBots: async () => {
        await apiHelper('/api/bots/start-all', { method: 'POST' }, 'Команда на запуск всех ботов отправлена.');
    },

    stopAllBots: async () => {
        await apiHelper('/api/bots/stop-all', { method: 'POST' }, 'Команда на остановку всех ботов отправлена.');
    },

    applyProxyToBots: async (botIds, proxySettings) => {
        try {
            const result = await apiHelper('/api/bots/bulk-proxy-update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botIds,
                    proxySettings
                })
            }, `Настройки прокси применены к ${botIds.length} бот(ам)`);
            
            if (result.success) {
                await get().fetchInitialData();
            }
            
            return result;
        } catch (error) {
            console.error('Failed to apply proxy settings:', error);
            throw error;
        }
    },
});