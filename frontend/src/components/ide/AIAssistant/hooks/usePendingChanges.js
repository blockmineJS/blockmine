import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

/**
 * Hook для управления pending changes (изменениями ожидающими применения)
 * Позволяет пользователю просматривать изменения перед их применением
 */
export function usePendingChanges({ botId, pluginName } = {}) {
    // Список pending changes: { id, filePath, oldContent, newContent, linesAdded, linesRemoved, isNewFile, status }
    const [pendingChanges, setPendingChanges] = useState([]);

    const [idCounter, setIdCounter] = useState(0);

    const pendingChangesRef = useRef(pendingChanges);
    useEffect(() => {
        pendingChangesRef.current = pendingChanges;
    }, [pendingChanges]);

    /**
     * Добавить новое изменение в очередь
     */
    const addPendingChange = useCallback((change) => {
        const newId = `change_${Date.now()}_${idCounter}`;
        setIdCounter(prev => prev + 1);

        const newChange = {
            id: newId,
            filePath: change.filePath,
            oldContent: change.oldContent || '',
            newContent: change.newContent,
            linesAdded: change.linesAdded || 0,
            linesRemoved: change.linesRemoved || 0,
            isNewFile: change.isNewFile || false,
            changedLineRanges: change.changedLineRanges || [],
            status: 'pending', // pending, applying, applied, rejected
            timestamp: Date.now()
        };

        setPendingChanges(prev => {
            const existingIndex = prev.findIndex(c => c.filePath === change.filePath);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { ...newChange, id: prev[existingIndex].id };
                return updated;
            }
            return [...prev, newChange];
        });

        return newId;
    }, [idCounter]);

    /**
     * Записать файл на диск через API
     */
    const writeFileToDisk = useCallback(async (filePath, content) => {
        if (!botId || !pluginName) {
            console.warn('[PendingChanges] botId or pluginName not provided, skipping disk write');
            return true;
        }

        const token = useAppStore.getState().token;

        try {
            const response = await fetch(`/api/bots/${botId}/plugins/ide/${pluginName}/ai/apply-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ filePath, content })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to apply change');
            }

            console.log('[PendingChanges] File written to disk:', filePath);
            return true;
        } catch (error) {
            console.error('[PendingChanges] Error writing file:', error);
            throw error;
        }
    }, [botId, pluginName]);

    /**
     * Применить конкретное изменение
     */
    const applyChange = useCallback(async (changeId, applyCallback) => {
        const change = pendingChangesRef.current.find(c => c.id === changeId);
        if (!change) return false;

        setPendingChanges(prev =>
            prev.map(c => c.id === changeId ? { ...c, status: 'applying' } : c)
        );

        try {
            await writeFileToDisk(change.filePath, change.newContent);

            if (applyCallback) {
                await applyCallback(change);
            }

            setPendingChanges(prev =>
                prev.filter(c => c.id !== changeId)
            );
            return true;
        } catch (error) {
            console.error('Error applying change:', error);
            setPendingChanges(prev =>
                prev.map(c => c.id === changeId ? { ...c, status: 'pending' } : c)
            );
            return false;
        }
    }, [writeFileToDisk]);

    /**
     * Отклонить конкретное изменение
     */
    const rejectChange = useCallback((changeId) => {
        setPendingChanges(prev => prev.filter(c => c.id !== changeId));
    }, []);

    /**
     * Применить все изменения
     */
    const applyAllChanges = useCallback(async (applyCallback) => {
        // Используем ref для получения актуального состояния
        const changesToApply = [...pendingChangesRef.current];

        for (const change of changesToApply) {
            await applyChange(change.id, applyCallback);
        }
    }, [applyChange]);

    /**
     * Отклонить все изменения
     */
    const rejectAllChanges = useCallback(() => {
        setPendingChanges([]);
    }, []);

    /**
     * Получить количество pending changes
     */
    const pendingCount = pendingChanges.filter(c => c.status === 'pending').length;

    /**
     * Проверить есть ли pending changes
     */
    const hasPendingChanges = pendingCount > 0;

    /**
     * Обновить статус изменения
     */
    const updateChangeStatus = useCallback((changeId, status) => {
        setPendingChanges(prev =>
            prev.map(c => c.id === changeId ? { ...c, status } : c)
        );
    }, []);

    return {
        pendingChanges,
        pendingCount,
        hasPendingChanges,
        addPendingChange,
        applyChange,
        rejectChange,
        applyAllChanges,
        rejectAllChanges,
        updateChangeStatus
    };
}
