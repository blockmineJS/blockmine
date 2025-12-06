import React from 'react';
import { Loader2, Check, FileText, Edit3, FolderTree, FolderOpen, Terminal, FileX, FolderX, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOOL_NAMES } from '../utils/constants';

export function ToolCallCard({ toolCall, onFileClick, onViewDiff }) {
    const getToolIcon = () => {
        switch (toolCall.toolName) {
            case TOOL_NAMES.READ_FILE: return <FileText className="h-4 w-4" />;
            case TOOL_NAMES.UPDATE_FILE: return <Edit3 className="h-4 w-4" />;
            case TOOL_NAMES.GET_PROJECT_TREE: return <FolderTree className="h-4 w-4" />;
            case TOOL_NAMES.GET_FULL_PROJECT_CONTEXT: return <FolderOpen className="h-4 w-4" />;
            case TOOL_NAMES.READ_BOT_LOGS: return <Terminal className="h-4 w-4" />;
            case TOOL_NAMES.DELETE_FILE: return <FileX className="h-4 w-4 text-red-400" />;
            case TOOL_NAMES.DELETE_FOLDER: return <FolderX className="h-4 w-4 text-red-400" />;
            case TOOL_NAMES.SEARCH_CODE: return <Search className="h-4 w-4 text-blue-400" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getToolDescription = () => {
        if (toolCall.toolName === TOOL_NAMES.READ_FILE) {
            const lines = toolCall.result ? toolCall.result.split('\n').length : 0;
            return `Прочитан файл: ${toolCall.args.filePath} (${lines} строк)`;
        } else if (toolCall.toolName === TOOL_NAMES.UPDATE_FILE) {
            if (toolCall.diffData) {
                const { linesAdded, linesRemoved, isNewFile, isPending, isApplied, isRejected } = toolCall.diffData;

                let prefix, color;
                if (isRejected) {
                    prefix = 'Отклонено';
                    color = 'text-red-400 line-through opacity-60';
                } else if (isPending) {
                    prefix = 'Ожидает';
                    color = 'text-yellow-400';
                } else if (isApplied) {
                    prefix = isNewFile ? 'Создан' : 'Обновлен';
                    color = 'text-green-400';
                } else {
                    prefix = isNewFile ? 'Создан' : 'Обновлен';
                    color = '';
                }

                if (isNewFile) {
                    return (
                        <span className={color}>
                            {prefix} файл: {toolCall.args.filePath} (+{linesAdded} строк)
                        </span>
                    );
                } else if (linesAdded > 0 || linesRemoved > 0) {
                    return (
                        <span className={color}>
                            {prefix}: {toolCall.args.filePath}{' '}
                            <span className={isRejected ? '' : 'text-green-400'}>+{linesAdded}</span>
                            {' '}
                            <span className={isRejected ? '' : 'text-red-400'}>-{linesRemoved}</span>
                        </span>
                    );
                }
            }
            const lines = toolCall.args.content ? toolCall.args.content.split('\n').length : 0;
            return `Обновлен файл: ${toolCall.args.filePath} (${lines} строк)`;
        } else if (toolCall.toolName === TOOL_NAMES.GET_PROJECT_TREE) {
            return 'Получена структура папок';
        } else if (toolCall.toolName === TOOL_NAMES.GET_FULL_PROJECT_CONTEXT) {
            return 'Загружен полный контекст проекта';
        } else if (toolCall.toolName === TOOL_NAMES.READ_BOT_LOGS) {
            const lines = toolCall.result ? toolCall.result.split('\n').length : 0;
            return `Прочитаны логи бота (${lines} записей)`;
        } else if (toolCall.toolName === TOOL_NAMES.DELETE_FILE) {
            return (
                <span className="text-red-400">
                    Удалён файл: {toolCall.args.filePath}
                </span>
            );
        } else if (toolCall.toolName === TOOL_NAMES.DELETE_FOLDER) {
            return (
                <span className="text-red-400">
                    Удалена папка: {toolCall.args.folderPath}
                </span>
            );
        } else if (toolCall.toolName === TOOL_NAMES.SEARCH_CODE) {
            const query = toolCall.args.query || '';
            const type = toolCall.args.type || 'text';
            return (
                <span className="text-blue-400">
                    Поиск: "{query}" ({type})
                </span>
            );
        }
        return toolCall.toolName;
    };

    const isClickable = toolCall.toolName === TOOL_NAMES.READ_FILE || toolCall.toolName === TOOL_NAMES.UPDATE_FILE;
    const canViewDiff = toolCall.toolName === TOOL_NAMES.UPDATE_FILE &&
                        toolCall.status === 'completed' &&
                        toolCall.diffData?.oldContent &&
                        toolCall.diffData?.newContent;

    return (
        <div
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                toolCall.status === 'executing' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30'
            }`}
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
            {canViewDiff && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewDiff(toolCall);
                    }}
                >
                    <Eye className="h-3 w-3" />
                    View Diff
                </Button>
            )}
        </div>
    );
}
