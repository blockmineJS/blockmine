import i18n from '@/i18n';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';

const translateCommon = (key, defaultValue, options = {}) =>
  i18n.t(key, { ns: 'common', defaultValue, ...options });

const API_BASE = '/api';
const STATS_SERVER_URL = 'http://185.65.200.184:3000';

export const apiHelper = async (url, options = {}, successMessage) => {
  const token = useAppStore.getState().token;
  const finalOptions = { ...options };

  finalOptions.headers = { ...options.headers };
  if (token) {
    finalOptions.headers.Authorization = `Bearer ${token}`;
  }

  if (finalOptions.body instanceof FormData) {
    // Let the browser set the multipart boundary.
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
          throw new Error(
            errData.error ||
              translateCommon('messages.downloadError', 'Ошибка при скачивании файла.')
          );
        } catch (error) {
          if (error instanceof Error && error.message) {
            throw error;
          }

          throw new Error(
            translateCommon('messages.downloadErrorWithStatus', 'Ошибка при скачивании файла: {{status}}', {
              status: response.statusText,
            })
          );
        }
      }

      return await response.blob();
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      if (successMessage) {
        toast({
          title: translateCommon('messages.success', 'Успех!'),
          description: successMessage,
        });
      }
      return true;
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        if (!url.endsWith('/api/auth/login')) {
          const { logout } = useAppStore.getState();
          logout();
        }

        throw new Error(
          data.error ||
            data.message ||
            translateCommon('messages.authError', 'Ошибка авторизации')
        );
      }

      throw new Error(
        data.error ||
          data.message ||
          translateCommon('messages.serverError', 'Произошла неизвестная ошибка на сервере')
      );
    }

    if (successMessage) {
      toast({
        title: translateCommon('messages.success', 'Успех!'),
        description: successMessage,
      });
    }

    return data;
  } catch (error) {
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      toast({
        variant: 'destructive',
        title: translateCommon('messages.networkTitle', 'Ошибка сети'),
        description: translateCommon('messages.networkDescription', 'Не удается подключиться к серверу'),
      });
    } else if (error.message.includes('Невалидный токен')) {
      const { logout } = useAppStore.getState();
      logout();
    } else {
      toast({
        variant: 'destructive',
        title: translateCommon('messages.error', 'Ошибка'),
        description: error.message,
      });
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
    console.error('Search API call failed:', error);
    return { bots: [], users: [], plugins: [] };
  }
};

export { API_BASE, STATS_SERVER_URL };
