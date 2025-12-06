import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';

/**
 * Hook для inline AI функционала в редакторе
 * Позволяет вызывать AI помощь прямо в позиции курсора
 */
export function useInlineAI({ botId, pluginName, settings }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0, lineNumber: 1, column: 1 });
    const [context, setContext] = useState({
        selectedText: '',
        currentLine: '',
        fileContent: '',
        filePath: '',
        cursorPosition: { lineNumber: 1, column: 1 }
    });
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const abortControllerRef = useRef(null);

    /**
     * Открыть inline AI палитру
     */
    const open = useCallback((editorContext) => {
        setPosition({
            x: editorContext.x || 0,
            y: editorContext.y || 0,
            lineNumber: editorContext.lineNumber || 1,
            column: editorContext.column || 1
        });
        setContext({
            selectedText: editorContext.selectedText || '',
            currentLine: editorContext.currentLine || '',
            fileContent: editorContext.fileContent || '',
            filePath: editorContext.filePath || '',
            cursorPosition: {
                lineNumber: editorContext.lineNumber || 1,
                column: editorContext.column || 1
            }
        });
        setResult(null);
        setError(null);
        setIsOpen(true);
    }, []);

    /**
     * Закрыть inline AI палитру
     */
    const close = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsOpen(false);
        setIsLoading(false);
        setResult(null);
        setError(null);
    }, []);

    /**
     * Отправить запрос к AI
     */
    const sendRequest = useCallback(async (prompt, action = 'general') => {
        if (!settings?.apiKey) {
            setError('API ключ не настроен');
            return null;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const token = useAppStore.getState().token;

        try {
            let contextPrompt = '';

            if (context.selectedText) {
                contextPrompt = `
Выделенный код:
\`\`\`
${context.selectedText}
\`\`\`
`;
            } else if (context.currentLine) {
                contextPrompt = `
Текущая строка (позиция курсора: строка ${context.cursorPosition.lineNumber}, колонка ${context.cursorPosition.column}):
\`\`\`
${context.currentLine}
\`\`\`
`;
            }

            // Добавляем контекст файла если есть
            if (context.filePath) {
                contextPrompt += `\nФайл: ${context.filePath}\n`;
            }

            const fullPrompt = `${contextPrompt}\nЗапрос пользователя: ${prompt}`;

            // Формируем системный промпт в зависимости от действия
            let systemInstruction = '';
            switch (action) {
                case 'explain':
                    systemInstruction = 'Объясни этот код кратко и понятно. Отвечай на русском.';
                    break;
                case 'refactor':
                    systemInstruction = 'Предложи улучшенную версию этого кода. Верни только код без объяснений.';
                    break;
                case 'fix':
                    systemInstruction = 'Найди и исправь проблемы в этом коде. Верни исправленный код.';
                    break;
                case 'complete':
                    systemInstruction = 'Продолжи этот код. Верни только код продолжения.';
                    break;
                case 'test':
                    systemInstruction = 'Напиши тесты для этого кода.';
                    break;
                case 'comment':
                    systemInstruction = 'Добавь комментарии к этому коду. Верни код с комментариями.';
                    break;
                default:
                    systemInstruction = 'Ты - AI помощник для разработчиков. Помоги с кодом. Отвечай кратко и по делу.';
            }

            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/ai/inline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: fullPrompt,
                    systemInstruction,
                    action,
                    context: {
                        selectedText: context.selectedText,
                        currentLine: context.currentLine,
                        filePath: context.filePath,
                        cursorPosition: context.cursorPosition
                    },
                    provider: settings.provider,
                    apiKey: settings.apiKey,
                    apiEndpoint: settings.apiEndpoint,
                    model: settings.getEffectiveModel(),
                    proxy: settings.proxy,
                    temperature: settings.temperature,
                    maxTokens: settings.maxTokens
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get AI response');
            }

            const data = await response.json();
            setResult(data.result);
            return data.result;

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('[InlineAI] Request aborted');
                return null;
            }
            console.error('[InlineAI] Error:', err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [botId, pluginName, settings, context]);

    /**
     * Быстрые действия
     */
    const actions = {
        explain: () => sendRequest('Объясни этот код', 'explain'),
        refactor: () => sendRequest('Улучши этот код', 'refactor'),
        fix: () => sendRequest('Исправь проблемы', 'fix'),
        complete: () => sendRequest('Продолжи код', 'complete'),
        test: () => sendRequest('Напиши тесты', 'test'),
        comment: () => sendRequest('Добавь комментарии', 'comment')
    };

    return {
        isOpen,
        isLoading,
        position,
        context,
        result,
        error,
        open,
        close,
        sendRequest,
        actions
    };
}
