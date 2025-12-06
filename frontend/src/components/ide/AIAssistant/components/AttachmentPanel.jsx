import React from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, FilePlus, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Получить иконку для файла по расширению
 */
function getFileIcon(fileName) {
    if (!fileName) return FileText;

    const ext = fileName.split('.').pop()?.toLowerCase();
    const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'json', 'css', 'html', 'md'];

    if (codeExtensions.includes(ext)) {
        return FileCode;
    }

    return FileText;
}

/**
 * Компонент отображения одного вложенного файла
 */
function AttachmentItem({ attachment, onRemove }) {
    const Icon = getFileIcon(attachment.name);

    return (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border text-sm group">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate flex-1" title={attachment.path || attachment.name}>
                {attachment.name}
            </span>
            {attachment.preview && (
                <span className="text-xs text-muted-foreground">
                    {attachment.preview.length > 50
                        ? attachment.preview.slice(0, 50) + '...'
                        : attachment.preview
                    }
                </span>
            )}
            <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(attachment.id)}
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}

/**
 * Панель вложений для чата
 */
export function AttachmentPanel({ attachments, onRemove, onClear }) {
    if (!attachments || attachments.length === 0) {
        return null;
    }

    return (
        <div className="border-t bg-muted/20 p-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FilePlus className="h-3 w-3" />
                    <span>Прикреплённые файлы ({attachments.length})</span>
                </div>
                {attachments.length > 1 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-xs px-2"
                        onClick={onClear}
                    >
                        Очистить все
                    </Button>
                )}
            </div>

            {/* Attachments List */}
            <div className="flex flex-wrap gap-2">
                {attachments.map(attachment => (
                    <AttachmentItem
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Drop Zone компонент для drag & drop файлов
 */
export function DropZone({ isActive, children }) {
    return (
        <div
            className={cn(
                "relative transition-all duration-200",
                isActive && "ring-2 ring-primary ring-inset"
            )}
        >
            {children}

            {/* Overlay когда активен drag */}
            {isActive && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-background/90 rounded-lg px-4 py-3 shadow-lg border flex items-center gap-2">
                        <FilePlus className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">Отпустите для добавления файла</span>
                    </div>
                </div>
            )}
        </div>
    );
}
