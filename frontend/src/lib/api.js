
import { useAppStore } from '@/stores/appStore';
import { toast } from '@/hooks/use-toast';

export const apiHelper = async (url, options = {}, successMessage) => {
    const token = useAppStore.getState().token;
    const finalOptions = { ...options };

    finalOptions.headers = { ...options.headers };
    if (token) {
        finalOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    if (finalOptions.body instanceof FormData) {
    } else if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
        finalOptions.headers['Content-Type'] = 'application/json';
    } else if (finalOptions.body && typeof finalOptions.body === 'string') {
        finalOptions.headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, finalOptions);

        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/zip') || contentType?.includes('application/octet-stream')) {
             if (!response.ok) {
                try {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Ошибка при скачивании файла.');
                } catch(e) {
                     throw new Error(`Ошибка при скачивании файла: ${response.statusText}`);
                }
            }
            return await response.blob();
        }

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
