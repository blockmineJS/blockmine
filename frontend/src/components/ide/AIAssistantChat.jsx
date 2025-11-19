import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Settings, Loader2, X, FileText, Edit3, FolderOpen, Check, Trash2, Terminal, FolderX, FileX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppStore } from '@/stores/appStore';

// Компонент карточки инструмента
function ToolCallCard({ toolCall, onFileClick }) {
    const getToolIcon = () => {
        switch (toolCall.toolName) {
            case 'readFile': return <FileText className="h-4 w-4" />;
            case 'updateFile': return <Edit3 className="h-4 w-4" />;
            case 'getFullProjectContext': return <FolderOpen className="h-4 w-4" />;
            case 'readBotLogs': return <Terminal className="h-4 w-4" />;
            case 'deleteFile': return <FileX className="h-4 w-4 text-red-400" />;
            case 'deleteFolder': return <FolderX className="h-4 w-4 text-red-400" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getToolDescription = () => {
        if (toolCall.toolName === 'readFile') {
            const lines = toolCall.result ? toolCall.result.split('\n').length : 0;
            return `Прочитан файл: ${toolCall.args.filePath} (${lines} строк)`;
        } else if (toolCall.toolName === 'updateFile') {
            // Проверяем есть ли данные о diff
            if (toolCall.diffData) {
                const { linesAdded, linesRemoved, isNewFile } = toolCall.diffData;
                if (isNewFile) {
                    return `Создан файл: ${toolCall.args.filePath} (+${linesAdded} строк)`;
                } else if (linesAdded > 0 || linesRemoved > 0) {
                    return (
                        <span>
                            Обновлен файл: {toolCall.args.filePath}{' '}
                            <span className="text-green-400">+{linesAdded}</span>
                            {' '}
                            <span className="text-red-400">-{linesRemoved}</span>
                        </span>
                    );
                }
            }
            const lines = toolCall.args.content ? toolCall.args.content.split('\n').length : 0;
            return `Обновлен файл: ${toolCall.args.filePath} (${lines} строк)`;
        } else if (toolCall.toolName === 'getFullProjectContext') {
            return 'Загружена структура проекта';
        } else if (toolCall.toolName === 'readBotLogs') {
            const lines = toolCall.result ? toolCall.result.split('\n').length : 0;
            return `Прочитаны логи бота (${lines} записей)`;
        } else if (toolCall.toolName === 'deleteFile') {
            return (
                <span className="text-red-400">
                    Удалён файл: {toolCall.args.filePath}
                </span>
            );
        } else if (toolCall.toolName === 'deleteFolder') {
            return (
                <span className="text-red-400">
                    Удалена папка: {toolCall.args.folderPath}
                </span>
            );
        }
        return toolCall.toolName;
    };

    const isClickable = toolCall.toolName === 'readFile' || toolCall.toolName === 'updateFile';

    return (
        <div
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                toolCall.status === 'executing' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30'
            } ${isClickable ? 'cursor-pointer hover:bg-opacity-20' : ''}`}
            onClick={() => {
                if (isClickable && toolCall.args.filePath) {
                    onFileClick(toolCall.args.filePath);
                }
            }}
        >
            <div className="flex-shrink-0">
                {toolCall.status === 'executing' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                    <Check className="h-4 w-4 text-green-500" />
                )}
            </div>
            <div className="flex-shrink-0 text-muted-foreground">
                {getToolIcon()}
            </div>
            <div className="flex-1 truncate">
                {getToolDescription()}
            </div>
        </div>
    );
}

export default function AIAssistantChat({ botId, pluginName, onClose, onFileUpdated }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [toolCalls, setToolCalls] = useState([]);

    // Настройки из localStorage
    const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') || '');
    const [apiEndpoint, setApiEndpoint] = useState(localStorage.getItem('ai_api_endpoint') || 'https://openrouter.ai/api/v1');
    const [model, setModel] = useState(localStorage.getItem('ai_model') || 'openrouter/sherlock-think-alpha');
    const [useCustomModel, setUseCustomModel] = useState(localStorage.getItem('ai_use_custom_model') === 'true');
    const [customModel, setCustomModel] = useState(localStorage.getItem('ai_custom_model') || '');

    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Загружаем историю чата при монтировании
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

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const saveSettings = () => {
        localStorage.setItem('ai_api_key', apiKey);
        localStorage.setItem('ai_api_endpoint', apiEndpoint);
        localStorage.setItem('ai_model', model);
        localStorage.setItem('ai_use_custom_model', useCustomModel.toString());
        localStorage.setItem('ai_custom_model', customModel);
        setShowSettings(false);
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        if (!apiKey) {
            alert('Пожалуйста, укажите API ключ в настройках');
            setShowSettings(true);
            return;
        }

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setToolCalls([]);

        try {
            const token = useAppStore.getState().token;
            console.log('[AI Chat] Token:', token ? 'exists' : 'missing');
            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            console.log('[AI Chat] Headers:', headers);
            console.log('[AI Chat] URL:', `/api/bots/${botId}/plugins/ide/${pluginName}/ai/chat`);

            const finalModel = useCustomModel && customModel ? customModel : model;

            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/ai/chat`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: input,
                    apiKey: apiKey,
                    apiEndpoint: apiEndpoint,
                    model: finalModel,
                    history: messages,
                    includeFiles: ['index.js', 'package.json']
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let assistantMessage = { role: 'assistant', content: '' };
            setMessages(prev => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                console.log('[AI Chat] Raw chunk received, lines:', lines.length);

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    console.log('[AI Chat] Processing line:', line.substring(0, 100));
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            console.log('[AI Chat] Received SSE event:', data.type, data);

                            if (data.type === 'chunk') {
                                assistantMessage.content += data.content;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1] = { ...assistantMessage };
                                    return newMessages;
                                });
                            } else if (data.type === 'done') {
                                setIsLoading(false);
                            } else if (data.type === 'file_updated') {
                                console.log('[AI Chat] File updated event received!');
                                console.log('[AI Chat] - filePath:', data.filePath);
                                console.log('[AI Chat] - newContent length:', data.newContent?.length);
                                console.log('[AI Chat] - diff:', { linesAdded: data.linesAdded, linesRemoved: data.linesRemoved });
                                console.log('[AI Chat] - changedLineRanges:', data.changedLineRanges);

                                // Обновляем tool call с diff данными
                                setToolCalls(prev => prev.map(tc =>
                                    tc.toolName === 'updateFile' && tc.args.filePath === data.filePath && tc.status === 'executing'
                                        ? {
                                            ...tc,
                                            diffData: {
                                                linesAdded: data.linesAdded,
                                                linesRemoved: data.linesRemoved,
                                                isNewFile: data.isNewFile
                                            }
                                        }
                                        : tc
                                ));

                                console.log('[AI Chat] - onFileUpdated callback exists:', !!onFileUpdated);
                                if (onFileUpdated) {
                                    console.log('[AI Chat] Calling onFileUpdated callback...');
                                    onFileUpdated(data.filePath, data.newContent, data.oldContent, data.changedLineRanges);
                                } else {
                                    console.warn('[AI Chat] onFileUpdated callback is missing!');
                                }
                            } else if (data.type === 'file_deleted') {
                                console.log('[AI Chat] File deleted event:', data.filePath);
                                // Обновляем файловое дерево
                                if (onFileUpdated) {
                                    // Используем тот же callback для обновления дерева
                                    onFileUpdated(data.filePath, null, null, null);
                                }
                            } else if (data.type === 'folder_deleted') {
                                console.log('[AI Chat] Folder deleted event:', data.folderPath);
                                // Обновляем файловое дерево
                                if (onFileUpdated) {
                                    onFileUpdated(data.folderPath, null, null, null);
                                }
                            } else if (data.type === 'tool_call') {
                                console.log('[AI Chat] Tool call:', data.toolName, data.args);
                                setToolCalls(prev => [...prev, {
                                    id: Date.now(),
                                    toolName: data.toolName,
                                    args: data.args,
                                    status: 'executing'
                                }]);
                            } else if (data.type === 'tool_result') {
                                console.log('[AI Chat] Tool result:', data.toolName);
                                setToolCalls(prev => prev.map(tc =>
                                    tc.toolName === data.toolName && tc.status === 'executing'
                                        ? { ...tc, status: 'completed', result: data.result }
                                        : tc
                                ));
                            } else if (data.type === 'error') {
                                console.error('AI Error:', data.error);
                                assistantMessage.content += `\n\n❌ Ошибка: ${data.error}`;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1] = { ...assistantMessage };
                                    return newMessages;
                                });
                                setIsLoading(false);
                            }
                        } catch (e) {
                            console.error('[AI Chat] Parse error:', e, 'Line:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: `❌ Ошибка: ${error.message}` }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileClick = (filePath) => {
        console.log('[AI Chat] File clicked:', filePath);
        if (onFileUpdated) {
            // Просто открываем файл без изменения содержимого
            // Используем callback для сигнала о том, что нужно открыть файл
            // Передаем null как newContent чтобы только открыть файл
            onFileUpdated(filePath, null);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Вы уверены, что хотите очистить историю чата?')) {
            return;
        }

        try {
            const token = useAppStore.getState().token;
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/ai/chat`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[AI Chat] History cleared:', data);
                setMessages([]);
                setToolCalls([]);
            } else {
                console.error('[AI Chat] Failed to clear history');
            }
        } catch (error) {
            console.error('[AI Chat] Error clearing history:', error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background border-l">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">AI Помощник</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClearHistory}
                        title="Очистить историю чата"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSettings(!showSettings)}
                        title="Настройки"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        title="Закрыть"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="p-4 border-b bg-muted/30 space-y-3">
                    <div>
                        <label className="text-sm font-medium mb-1 block">API Ключ</label>
                        <Input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">API Endpoint</label>
                        <Input
                            type="text"
                            value={apiEndpoint}
                            onChange={(e) => setApiEndpoint(e.target.value)}
                            placeholder="https://openrouter.ai/api/v1"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                id="useCustomModel"
                                checked={useCustomModel}
                                onChange={(e) => setUseCustomModel(e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="useCustomModel" className="text-sm font-medium cursor-pointer">
                                Использовать кастомную модель
                            </label>
                        </div>
                        {!useCustomModel ? (
                            <select
                                className="w-full p-2 rounded-md border bg-background"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            >
                                <option value="openrouter/sherlock-think-alpha">Sherlock Think Alpha</option>
                                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                                <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
                                <option value="openai/gpt-4">GPT-4</option>
                                <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </select>
                        ) : (
                            <Input
                                type="text"
                                value={customModel}
                                onChange={(e) => setCustomModel(e.target.value)}
                                placeholder="Введите название модели (например, anthropic/claude-3.5-sonnet)"
                            />
                        )}
                    </div>
                    <Button onClick={saveSettings} className="w-full">
                        Сохранить настройки
                    </Button>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Задайте вопрос о вашем плагине</p>
                            <p className="text-sm mt-1">Я помогу с кодом, отладкой и улучшениями</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx}>
                            <div
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return !inline && match ? (
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        ) : (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                            </div>

                            {/* Tool calls after assistant message */}
                            {msg.role === 'assistant' && idx === messages.length - 1 && toolCalls.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {toolCalls.map(tc => (
                                        <ToolCallCard key={tc.id} toolCall={tc} onFileClick={handleFileClick} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-lg p-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Напишите сообщение..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        size="icon"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
