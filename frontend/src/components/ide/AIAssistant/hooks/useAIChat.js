import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';

export function useAIChat({ botId, pluginName }) {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activity, setActivity] = useState('idle');
    const [currentFile, setCurrentFile] = useState(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const token = useAppStore.getState().token;
                const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/ai/chat`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.history && data.history.length > 0) {
                        setMessages(data.history);
                        console.log(`[AI Chat] Loaded ${data.history.length} messages from history`);
                    }
                }
            } catch (error) {
                console.error('[AI Chat] Error loading history:', error);
            }
        };

        loadHistory();
    }, [botId, pluginName]);

    const sendMessage = useCallback(async (messageText, settings, processStream) => {
        const token = useAppStore.getState().token;

        if (!messageText.trim() || isLoading) return;

        if (!settings.apiKey) {
            alert('Пожалуйста, укажите API ключ в настройках');
            throw new Error('API key required');
        }

        const userMessage = { role: 'user', content: messageText };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setActivity('sending');

        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const finalModel = settings.getEffectiveModel();

            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/ai/chat`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: messageText,
                    provider: settings.provider,
                    apiKey: settings.apiKey,
                    apiEndpoint: settings.apiEndpoint,
                    model: finalModel,
                    proxy: settings.proxy,
                    history: messages,
                    includeFiles: ['index.js', 'package.json']
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            console.log('[AI Chat] Handling SSE stream');
            const assistantMessage = { role: 'assistant', content: '' };
            setMessages(prev => [...prev, assistantMessage]);
            setActivity('streaming');

            await processStream(response, assistantMessage);

        } catch (error) {
            console.error('[AI Chat] Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Ошибка: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
            setActivity('idle');
            setCurrentFile(null);
        }
    }, [botId, pluginName, messages, isLoading]);

    const clearHistory = useCallback(async () => {
        const token = useAppStore.getState().token;

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/ai/chat`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setMessages([]);
                console.log('[AI Chat] History cleared');
            }
        } catch (error) {
            console.error('[AI Chat] Error clearing history:', error);
        }
    }, [botId, pluginName]);

    return {
        messages,
        setMessages,
        isLoading,
        sendMessage,
        clearHistory,
        activity,
        currentFile,
        setActivity,
        setCurrentFile
    };
}
