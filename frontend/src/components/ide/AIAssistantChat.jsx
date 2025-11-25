import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Settings, Loader2, X, Trash2 } from 'lucide-react';
import { useAISettings } from './AIAssistant/hooks/useAISettings';
import { useToolCalls } from './AIAssistant/hooks/useToolCalls';
import { useSSEStream } from './AIAssistant/hooks/useSSEStream';
import { useAIChat } from './AIAssistant/hooks/useAIChat';
import { SettingsPanel } from './AIAssistant/components/SettingsPanel';
import { ChatMessages } from './AIAssistant/components/ChatMessages';
import { DiffViewer } from './AIAssistant/components/DiffViewer';
import { ProgressIndicator } from './AIAssistant/components/ProgressIndicator';

export default function AIAssistantChat({ botId, pluginName, onClose, onFileUpdated }) {
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [diffViewerData, setDiffViewerData] = useState(null);
    const messagesEndRef = useRef(null);

    const settings = useAISettings();
    const { toolCalls, addToolCall, updateToolCall, updateToolCallWithDiff, clearToolCalls } = useToolCalls();
    const { messages, setMessages, isLoading, sendMessage, clearHistory, activity, currentFile, setActivity, setCurrentFile } = useAIChat({ botId, pluginName });

    const { processStream } = useSSEStream({
        onChunk: (content, assistantMessage) => {
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...assistantMessage };
                return newMessages;
            });
        },
        onDone: () => {
            // Cleanup handled by useAIChat
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
        onToolCall: (toolName, args) => {
            console.log('[AI Chat] Tool call:', toolName, args);
            addToolCall(toolName, args);

            // Update activity based on tool
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

            // Reset to streaming after tool completes
            setActivity('streaming');
            setCurrentFile(null);
        },
        onFileUpdated: (data) => {
            console.log('[AI Chat] File updated event received!');
            updateToolCallWithDiff(data.filePath, {
                linesAdded: data.linesAdded,
                linesRemoved: data.linesRemoved,
                isNewFile: data.isNewFile,
                oldContent: data.oldContent,
                newContent: data.newContent
            });

            if (onFileUpdated) {
                console.log('[AI Chat] Calling onFileUpdated callback...');
                onFileUpdated(data.filePath, data.newContent, data.oldContent, data.changedLineRanges);
            } else {
                console.warn('[AI Chat] onFileUpdated callback is missing!');
            }
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

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const messageText = input;
        setInput('');
        clearToolCalls();

        try {
            await sendMessage(messageText, settings, processStream);
        } catch (error) {
            console.error('Error sending message:', error);
        }
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
        <div className="flex flex-col h-full bg-background border rounded-lg shadow-lg">
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

            {/* Input */}
            <div className="p-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Задайте вопрос о плагине..."
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
