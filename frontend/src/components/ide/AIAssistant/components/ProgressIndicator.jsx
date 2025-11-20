import React from 'react';
import { Loader2 } from 'lucide-react';

const ACTIVITY_LABELS = {
    idle: '',
    sending: 'Отправка запроса...',
    streaming: 'Получение ответа...',
    readingFile: 'Читаю файлы...',
    updatingFile: 'Обновляю файлы...',
    analyzing: 'Анализирую код...',
    generating: 'Генерирую код...',
    processing: 'Обрабатываю...',
};

export function ProgressIndicator({ activity, currentFile }) {
    if (!activity || activity === 'idle') {
        return null;
    }

    const label = ACTIVITY_LABELS[activity] || 'Обрабатываю...';

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
                {label}
                {currentFile && <span className="text-muted-foreground ml-1">({currentFile})</span>}
            </span>
        </div>
    );
}
