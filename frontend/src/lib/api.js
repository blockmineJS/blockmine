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

    const finalOptions = { ...options, headers };

    if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }

    try {
        const response = await fetch(url, finalOptions);


        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (successMessage) toast({ title: "Успех!", description: successMessage });
            return true;
        }

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                if (!url.endsWith('/api/auth/login')) {
                    const { logout } = useAppStore.getState();
                    logout();
                }
                throw new Error(data.error || 'Ошибка авторизации');
            }
            throw new Error(data.error || 'Произошла неизвестная ошибка на сервере');
        }

        if (successMessage) toast({ title: "Успех!", description: successMessage });
        return data;

    } catch (error) {
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            toast({ variant: "destructive", title: "Ошибка сети", description: "Не удается подключиться к серверу" });
        } else if (error.message.includes('Невалидный токен')) {
            const { logout } = useAppStore.getState();
            logout();
            return null;
        } else {
            toast({ variant: "destructive", title: "Ошибка", description: error.message });
        }
        throw error;
    }
};

export const api = {
    get: (url, successMessage) => apiHelper(url, { method: 'GET' }, successMessage),
    post: (url, body, successMessage) => apiHelper(url, { method: 'POST', body }, successMessage),
    put: (url, body, successMessage) => apiHelper(url, { method: 'PUT', body }, successMessage),
    delete: (url, successMessage) => apiHelper(url, { method: 'DELETE' }, successMessage),
};

export const search = async (query) => {
    try {
        return await apiHelper(`/api/search?query=${encodeURIComponent(query)}`);
    } catch (error) {
        console.error("Search API call failed:", error);
        return { bots: [], users: [], plugins: [] };
    }
};
