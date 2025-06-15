import { toast } from '@/hooks/use-toast';

const apiCall = async (url, options = {}, successMessage) => {
    try {
        const response = await fetch(url, options);
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (successMessage) toast({ title: "Успех!", description: successMessage });
            return true;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Произошла неизвестная ошибка на сервере');
        if (successMessage) toast({ title: "Успех!", description: successMessage });
        return data;
    } catch (error) {
        toast({ variant: "destructive", title: "Ошибка", description: error.message });
        throw error;
    }
};

export const createBotActionsSlice = (set, get) => ({
    createBot: async (botData) => {
        const newBot = await apiCall('/api/bots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(botData),
        }, "Новый бот успешно создан.");
        await get().fetchInitialData();
        return newBot;
    },

    startBot: async (botId) => {
        await apiCall(`/api/bots/${botId}/start`, { method: 'POST' });
    },

    stopBot: async (botId) => {
        await apiCall(`/api/bots/${botId}/stop`, { method: 'POST' });
    },
    
    deleteBot: async (botId) => {
        await apiCall(`/api/bots/${botId}`, { method: 'DELETE' }, "Бот успешно удален.");
        await get().fetchInitialData();
    },

    startAllBots: async () => {
        await apiCall('/api/bots/start-all', { method: 'POST' }, 'Команда на запуск всех ботов отправлена.');
    },

    stopAllBots: async () => {
        await apiCall('/api/bots/stop-all', { method: 'POST' }, 'Команда на остановку всех ботов отправлена.');
    },
});