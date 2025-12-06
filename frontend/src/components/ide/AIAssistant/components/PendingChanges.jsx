import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Check,
    X,
    ChevronDown,
    ChevronRight,
    FileText,
    FilePlus,
    Eye,
    CheckCheck,
    XCircle,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Компонент для отображения отдельного изменения файла
 */
function PendingChangeItem({ change, onApply, onReject, onViewDiff }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getStatusIcon = () => {
        switch (change.status) {
            case 'applying':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'applied':
                return <Check className="h-4 w-4 text-green-500" />;
            case 'rejected':
                return <X className="h-4 w-4 text-red-500" />;
            default:
                return null;
        }
    };

    const fileName = change.filePath.split('/').pop();

    return (
        <div className={cn(
            "border rounded-lg overflow-hidden transition-all",
            change.status === 'pending' ? "border-yellow-500/30 bg-yellow-500/5" : "",
            change.status === 'applying' ? "border-blue-500/30 bg-blue-500/5" : "",
            change.status === 'applied' ? "border-green-500/30 bg-green-500/5" : "",
            change.status === 'rejected' ? "border-red-500/30 bg-red-500/5 opacity-50" : ""
        )}>
            {/* Header */}
            <div
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30"
                role="button"
                tabIndex={0}
                onClick={() => setIsExpanded(!isExpanded)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsExpanded(!isExpanded);
                    }
                }}
            >
                {/* Expand/Collapse */}
                <span className="p-0.5" aria-hidden="true">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                </span>

                {/* File Icon */}
                {change.isNewFile ? (
                    <FilePlus className="h-4 w-4 text-green-500" />
                ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                )}

                {/* File Name */}
                <span className="flex-1 truncate text-sm font-medium" title={change.filePath}>
                    {fileName}
                </span>

                {/* Stats */}
                <div className="flex items-center gap-2 text-xs">
                    {change.linesAdded > 0 && (
                        <span className="text-green-500">+{change.linesAdded}</span>
                    )}
                    {change.linesRemoved > 0 && (
                        <span className="text-red-500">-{change.linesRemoved}</span>
                    )}
                </div>

                {/* Status Icon */}
                {getStatusIcon()}

                {/* Actions */}
                {change.status === 'pending' && (
                    <div className="flex items-center gap-1" role="presentation" onClick={e => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onViewDiff(change)}
                            title="Просмотр изменений"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => onApply(change.id)}
                            title="Применить"
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => onReject(change.id)}
                            title="Отклонить"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Expanded Content - Preview */}
            {isExpanded && (
                <div className="border-t bg-muted/20 p-2">
                    <div className="text-xs text-muted-foreground mb-2">
                        {change.isNewFile ? 'Новый файл' : 'Изменения в файле'}:
                        <span className="ml-1 text-foreground">{change.filePath}</span>
                    </div>

                    {/* Mini Diff Preview */}
                    {(() => {
                        const lines = change.newContent.split('\n');
                        return (
                            <div className="max-h-32 overflow-auto rounded border bg-background text-xs font-mono">
                                {lines.slice(0, 10).map((line, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "px-2 py-0.5",
                                            change.isNewFile ? "bg-green-500/10" : ""
                                        )}
                                    >
                                        <span className="text-muted-foreground mr-2 select-none">
                                            {String(i + 1).padStart(3)}
                                        </span>
                                        {line || ' '}
                                    </div>
                                ))}
                                {lines.length > 10 && (
                                    <div className="px-2 py-1 text-muted-foreground italic">
                                        ... ещё {lines.length - 10} строк
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

/**
 * Главный компонент панели pending changes
 */
export function PendingChanges({
    pendingChanges,
    pendingCount,
    onApply,
    onReject,
    onApplyAll,
    onRejectAll,
    onViewDiff,
    isBulkLoading = false
}) {
    if (pendingChanges.length === 0) {
        return null;
    }

    return (
        <div className="border-b bg-muted/10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-yellow-500/10">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-yellow-950 text-xs font-bold">
                        {pendingCount}
                    </div>
                    <span className="text-sm font-medium">
                        {pendingCount === 1 ? 'Изменение ожидает применения' : 'Изменения ожидают применения'}
                    </span>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={onApplyAll}
                        disabled={isBulkLoading}
                    >
                        {isBulkLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCheck className="h-4 w-4" />
                        )}
                        <span className="text-xs">Применить все</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={onRejectAll}
                        disabled={isBulkLoading}
                    >
                        {isBulkLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <XCircle className="h-4 w-4" />
                        )}
                        <span className="text-xs">Отклонить все</span>
                    </Button>
                </div>
            </div>

            {/* Changes List */}
            <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                {pendingChanges.map(change => (
                    <PendingChangeItem
                        key={change.id}
                        change={change}
                        onApply={onApply}
                        onReject={onReject}
                        onViewDiff={onViewDiff}
                    />
                ))}
            </div>
        </div>
    );
}
