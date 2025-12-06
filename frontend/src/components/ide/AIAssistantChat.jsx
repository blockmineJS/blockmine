import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Settings, Loader2, X, Trash2, Eye, EyeOff, Paperclip } from 'lucide-react';
import { useAISettings } from './AIAssistant/hooks/useAISettings';
import { useToolCalls } from './AIAssistant/hooks/useToolCalls';
import { useSSEStream } from './AIAssistant/hooks/useSSEStream';
import { useAIChat } from './AIAssistant/hooks/useAIChat';
import { usePendingChanges } from './AIAssistant/hooks/usePendingChanges';
import { useAttachments } from './AIAssistant/hooks/useAttachments';
import { SettingsPanel } from './AIAssistant/components/SettingsPanel';
import { ChatMessages } from './AIAssistant/components/ChatMessages';
import { DiffViewer } from './AIAssistant/components/DiffViewer';
import { ProgressIndicator } from './AIAssistant/components/ProgressIndicator';
import { PendingChanges } from './AIAssistant/components/PendingChanges';
import { AttachmentPanel, DropZone } from './AIAssistant/components/AttachmentPanel';
import { APPLY_MODES } from './AIAssistant/utils/constants';
import { emitShowDiff, subscribeToDiffEvents } from './AIAssistant/utils/diffEvents';

export default function AIAssistantChat({ botId, pluginName, onClose, onFileUpdated }) {
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [diffViewerData, setDiffViewerData] = useState(null);
    const [previewMode, setPreviewMode] = useState(true); // Preview mode включен по умолчанию
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const pendingChangesRef = useRef([]);

    const settings = useAISettings();
    const { toolCalls, addToolCall, updateToolCall, updateToolCallWithDiff, clearToolCalls } = useToolCalls();
    const { messages, setMessages, isLoading, sendMessage, clearHistory, activity, currentFile, setActivity, setCurrentFile } = useAIChat({ botId, pluginName });

    const {
        pendingChanges,
        pendingCount,
        hasPendingChanges,
        addPendingChange,
        applyChange,
        rejectChange,
        applyAllChanges,
        rejectAllChanges
    } = usePendingChanges({ botId, pluginName });

    useEffect(() => {
        pendingChangesRef.current = pendingChanges;
    }, [pendingChanges]);

    const {
        attachments,
        isDragging,
        removeAttachment,
        clearAttachments,
        getAttachmentPaths,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop
    } = useAttachments();

    const { processStream } = useSSEStream({
        onChunk: (content, assistantMessage) => {
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...assistantMessage };
                return newMessages;
            });
        },
        onDone: () => {
            console.log('[AI Chat] Stream done');
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
        onToolCall: (toolName, args) => {
            console.log('[AI Chat] Tool call:', toolName, args);
            addToolCall(toolName, args);

            if (toolName === 'readFile') {
                setActivity('readingFile');
                setCurrentFile(args.filePath);
            } else if (toolName === 'updateFile') {
                setActivity('updatingFile');
                setCurrentFile(args.filePath);
            } else {
                setActivity('processing');
            }
        },
        onToolResult: (toolName, result) => {
            console.log('[AI Chat] Tool result:', toolName);
            updateToolCall(toolName, { status: 'completed', result });

            setActivity('streaming');
            setCurrentFile(null);
        },
        onFileUpdated: (data) => {
            console.log('[AI Chat] File updated event received! Preview mode:', previewMode);
            updateToolCallWithDiff(data.filePath, {
                linesAdded: data.linesAdded,
                linesRemoved: data.linesRemoved,
                isNewFile: data.isNewFile,
                oldContent: data.oldContent,
                newContent: data.newContent
            });

            // В preview mode НЕ применяем изменения сразу - они уже добавлены в pending
            // В immediate mode применяем сразу
            if (!previewMode) {
                if (onFileUpdated) {
                    console.log('[AI Chat] Calling onFileUpdated callback...');
                    onFileUpdated(data.filePath, data.newContent, data.oldContent, data.changedLineRanges);
                } else {
                    console.warn('[AI Chat] onFileUpdated callback is missing!');
                }
            }
        },
        onFilePreview: (data) => {
            console.log('[AI Chat] File preview event received:', data.filePath);
            const changeId = addPendingChange({
                filePath: data.filePath,
                oldContent: data.oldContent,
                newContent: data.newContent,
                linesAdded: data.linesAdded,
                linesRemoved: data.linesRemoved,
                isNewFile: data.isNewFile,
                changedLineRanges: data.changedLineRanges
            });

            // Обновляем tool call с diff data
            updateToolCallWithDiff(data.filePath, {
                linesAdded: data.linesAdded,
                linesRemoved: data.linesRemoved,
                isNewFile: data.isNewFile,
                oldContent: data.oldContent,
                newContent: data.newContent,
                isPending: true
            });

            emitShowDiff(data.filePath, data.oldContent, data.newContent, changeId);
        },
        onFilePreviewApplied: (data) => {
            console.log('[AI Chat] File preview applied:', data.filePath);
        },
        onFileDeleted: (filePath) => {
            console.log('[AI Chat] File deleted event:', filePath);
            if (onFileUpdated) {
                onFileUpdated(filePath, null, null, null);
            }
        },
        onFolderDeleted: (folderPath) => {
            console.log('[AI Chat] Folder deleted event:', folderPath);
            if (onFileUpdated) {
                onFileUpdated(folderPath, null, null, null);
            }
        }
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Refs для функций чтобы избежать переподписок (исправляет event listener leak)
    const applyChangeRef = useRef(applyChange);
    const rejectChangeRef = useRef(rejectChange);
    const onFileUpdatedRef = useRef(onFileUpdated);
    const updateToolCallWithDiffRef = useRef(updateToolCallWithDiff);
    const setMessagesRef = useRef(setMessages);

    useEffect(() => {
        applyChangeRef.current = applyChange;
        rejectChangeRef.current = rejectChange;
        onFileUpdatedRef.current = onFileUpdated;
        updateToolCallWithDiffRef.current = updateToolCallWithDiff;
        setMessagesRef.current = setMessages;
    }, [applyChange, rejectChange, onFileUpdated, updateToolCallWithDiff, setMessages]);

    useEffect(() => {
        const unsubscribe = subscribeToDiffEvents({
            onAcceptDiff: async ({ filePath, newContent, changeId }) => {
                console.log('[AI Chat] Accept diff event:', filePath);
                const change = pendingChangesRef.current.find(c => c.filePath === filePath);
                if (change) {
                    console.log('[AI Chat] Found change, applying...');

                    try {
                        await applyChangeRef.current(change.id, () => {
                            if (onFileUpdatedRef.current) {
                                onFileUpdatedRef.current(filePath, newContent, change.oldContent, change.changedLineRanges);
                            }
                        });

                        console.log('[AI Chat] Change applied successfully, updating status to applied');
                        updateToolCallWithDiffRef.current(filePath, {
                            ...change,
                            isPending: false,
                            isApplied: true
                        });
                    } catch (error) {
                        console.error('[AI Chat] Failed to apply change:', error);
                    }
                } else {
                    console.log('[AI Chat] Change not found in pendingChanges for:', filePath);
                }
            },
            onRejectDiff: ({ filePath, changeId }) => {
                console.log('[AI Chat] Reject diff event:', filePath);
                const change = pendingChangesRef.current.find(c => c.filePath === filePath);
                if (change) {
                    console.log('[AI Chat] Found change, updating status to rejected');
                    // Обновляем статус tool call - помечаем как отклонённый
                    updateToolCallWithDiffRef.current(filePath, {
                        ...change,
                        isPending: false,
                        isRejected: true
                    });

                    rejectChangeRef.current(change.id);

                    // Добавляем сообщение в чат чтобы AI знал об отмене
                    setMessagesRef.current(prev => [...prev, {
                        role: 'user',
                        content: `[Изменения в файле ${filePath} были отклонены пользователем]`
                    }]);
                } else {
                    console.log('[AI Chat] Change not found in pendingChanges for:', filePath);
                }
            }
        });

        return unsubscribe;
    }, []); // Убрали зависимости - подписываемся только при mount

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const messageText = input;
        setInput('');
        clearToolCalls();

        try {
            const applyMode = previewMode ? APPLY_MODES.PREVIEW : APPLY_MODES.IMMEDIATE;

            const includeFiles = getAttachmentPaths();

            await sendMessage(messageText, settings, processStream, applyMode, includeFiles, settings.autoFormat);

            clearAttachments();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleApplyChange = async (changeId) => {
        const change = pendingChangesRef.current.find(c => c.id === changeId);

        try {
            await applyChange(changeId, async (appliedChange) => {
                if (onFileUpdated) {
                    onFileUpdated(appliedChange.filePath, appliedChange.newContent, appliedChange.oldContent, appliedChange.changedLineRanges);
                }
            });

            if (change) {
                updateToolCallWithDiff(change.filePath, {
                    ...change,
                    isPending: false,
                    isApplied: true
                });
            }
        } catch (error) {
            console.error('[AI Chat] Failed to apply change:', error);
        }
    };

    // Обработчик применения всех изменений
    const handleApplyAllChanges = async () => {
        setIsBulkLoading(true);
        try {
            await applyAllChanges(async (change) => {
                if (onFileUpdated) {
                    onFileUpdated(change.filePath, change.newContent, change.oldContent, change.changedLineRanges);
                }

                updateToolCallWithDiff(change.filePath, {
                    ...change,
                    isPending: false,
                    isApplied: true
                });
            });
        } finally {
            setIsBulkLoading(false);
        }
    };

    // Обработчик отклонения одного изменения (из PendingChanges panel)
    const handleRejectChange = (changeId) => {
        const change = pendingChangesRef.current.find(c => c.id === changeId);
        if (change) {
            // Обновляем статус tool call - помечаем как отклонённый
            updateToolCallWithDiff(change.filePath, {
                ...change,
                isPending: false,
                isRejected: true
            });

            // Добавляем сообщение в чат чтобы AI знал об отмене
            setMessages(prev => [...prev, {
                role: 'user',
                content: `[Изменения в файле ${change.filePath} были отклонены пользователем]`
            }]);
        }
        rejectChange(changeId);
    };

    const handleRejectAllChanges = async () => {
        setIsBulkLoading(true);
        try {
            pendingChangesRef.current.forEach(change => {
                updateToolCallWithDiff(change.filePath, {
                    ...change,
                    isPending: false,
                    isRejected: true
                });
            });

            const files = pendingChangesRef.current.map(c => c.filePath).join(', ');
            setMessages(prev => [...prev, {
                role: 'user',
                content: `[Все изменения были отклонены пользователем: ${files}]`
            }]);

            await rejectAllChanges();
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleViewPendingDiff = (change) => {
        setDiffViewerData({
            oldContent: change.oldContent,
            newContent: change.newContent,
            fileName: change.filePath
        });
    };

    const handleSaveSettings = () => {
        settings.saveSettings();
        setShowSettings(false);
    };

    const handleClearHistory = async () => {
        if (confirm('Вы уверены, что хотите очистить историю чата?')) {
            await clearHistory();
            clearToolCalls();
        }
    };

    const handleFileClick = (filePath) => {
        console.log('[AI Chat] File clicked:', filePath);
    };

    const handleViewDiff = (toolCall) => {
        setDiffViewerData({
            oldContent: toolCall.diffData?.oldContent,
            newContent: toolCall.diffData?.newContent,
            fileName: toolCall.args.filePath
        });
    };

    return (
        <div
            className="flex flex-col h-full bg-background border rounded-lg shadow-lg relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
        >
            {/* Drop Zone Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none z-50 rounded-lg">
                    <div className="bg-background/90 rounded-lg px-4 py-3 shadow-lg border flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Отпустите для добавления файла</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <h3 className="font-semibold">AI Помощник</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewMode(!previewMode)}
                        title={previewMode ? "Preview Mode: ВКЛ (изменения требуют подтверждения)" : "Preview Mode: ВЫКЛ (изменения применяются сразу)"}
                        className={previewMode ? "text-yellow-500" : "text-muted-foreground"}
                    >
                        {previewMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClearHistory}
                        title="Очистить историю"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <SettingsPanel settings={settings} onSave={handleSaveSettings} />
            )}

            {/* Pending Changes Panel */}
            {hasPendingChanges && (
                <PendingChanges
                    pendingChanges={pendingChanges}
                    pendingCount={pendingCount}
                    onApply={handleApplyChange}
                    onReject={handleRejectChange}
                    onApplyAll={handleApplyAllChanges}
                    onRejectAll={handleRejectAllChanges}
                    onViewDiff={handleViewPendingDiff}
                    isBulkLoading={isBulkLoading}
                />
            )}

            {/* Progress Indicator */}
            {activity !== 'idle' && (
                <div className="px-4 pt-3">
                    <ProgressIndicator activity={activity} currentFile={currentFile} />
                </div>
            )}

            {/* Messages */}
            <ChatMessages
                messages={messages}
                toolCalls={toolCalls}
                onFileClick={handleFileClick}
                onViewDiff={handleViewDiff}
                messagesEndRef={messagesEndRef}
            />

            {/* Attachments */}
            {attachments.length > 0 && (
                <AttachmentPanel
                    attachments={attachments}
                    onRemove={removeAttachment}
                    onClear={clearAttachments}
                />
            )}

            {/* Input */}
            <div className="p-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder={attachments.length > 0 ? `Задайте вопрос (${attachments.length} файлов)...` : "Задайте вопрос о плагине..."}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    Перетащите файлы сюда для добавления контекста
                </div>
            </div>

            {/* Diff Viewer Modal */}
            {diffViewerData && (
                <DiffViewer
                    oldContent={diffViewerData.oldContent}
                    newContent={diffViewerData.newContent}
                    fileName={diffViewerData.fileName}
                    onClose={() => setDiffViewerData(null)}
                />
            )}
        </div>
    );
}
