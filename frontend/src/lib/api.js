
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/hooks/use-toast';

export const apiHelper = async (url, options = {}, successMessage) => {
    const token = useAppStore.getState().token;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (successMessage) toast({ title: "Успех!", description: successMessage });
            return true;
        }

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                useAppStore.getState().logout();
            }
            throw new Error(data.error || 'Произошла неизвестная ошибка на сервере');
        }

        if (successMessage) toast({ title: "Успех!", description: successMessage });
        return data;

    } catch (error) {
        if (error.message !== 'Невалидный токен' && error.message !== 'Нет токена, доступ запрещен') {
            toast({ variant: "destructive", title: "Ошибка", description: error.message });
        }
        throw error;
    }
};