/**
 * События для синхронизации inline diff между AIAssistantChat и EditorGroup
 */

// Названия событий
export const DIFF_EVENTS = {
    SHOW_DIFF: 'ai:show-diff',       // Показать diff в редакторе
    ACCEPT_DIFF: 'ai:accept-diff',   // Пользователь принял изменения
    REJECT_DIFF: 'ai:reject-diff',   // Пользователь отклонил изменения
    CLEAR_DIFF: 'ai:clear-diff'      // Очистить diff
};

/**
 * Отправить событие показа diff
 */
export function emitShowDiff(filePath, oldContent, newContent, changeId) {
    window.dispatchEvent(new CustomEvent(DIFF_EVENTS.SHOW_DIFF, {
        detail: { filePath, oldContent, newContent, changeId }
    }));
}

/**
 * Отправить событие принятия diff
 */
export function emitAcceptDiff(filePath, newContent, changeId) {
    window.dispatchEvent(new CustomEvent(DIFF_EVENTS.ACCEPT_DIFF, {
        detail: { filePath, newContent, changeId }
    }));
}

/**
 * Отправить событие отклонения diff
 */
export function emitRejectDiff(filePath, changeId) {
    window.dispatchEvent(new CustomEvent(DIFF_EVENTS.REJECT_DIFF, {
        detail: { filePath, changeId }
    }));
}

/**
 * Отправить событие очистки diff
 */
export function emitClearDiff(filePath) {
    window.dispatchEvent(new CustomEvent(DIFF_EVENTS.CLEAR_DIFF, {
        detail: { filePath }
    }));
}

/**
 * Подписаться на события diff
 */
export function subscribeToDiffEvents(handlers) {
    const { onShowDiff, onAcceptDiff, onRejectDiff, onClearDiff } = handlers;

    const showHandler = (e) => onShowDiff?.(e.detail);
    const acceptHandler = (e) => onAcceptDiff?.(e.detail);
    const rejectHandler = (e) => onRejectDiff?.(e.detail);
    const clearHandler = (e) => onClearDiff?.(e.detail);

    if (onShowDiff) window.addEventListener(DIFF_EVENTS.SHOW_DIFF, showHandler);
    if (onAcceptDiff) window.addEventListener(DIFF_EVENTS.ACCEPT_DIFF, acceptHandler);
    if (onRejectDiff) window.addEventListener(DIFF_EVENTS.REJECT_DIFF, rejectHandler);
    if (onClearDiff) window.addEventListener(DIFF_EVENTS.CLEAR_DIFF, clearHandler);

    // Возвращаем функцию отписки
    return () => {
        window.removeEventListener(DIFF_EVENTS.SHOW_DIFF, showHandler);
        window.removeEventListener(DIFF_EVENTS.ACCEPT_DIFF, acceptHandler);
        window.removeEventListener(DIFF_EVENTS.REJECT_DIFF, rejectHandler);
        window.removeEventListener(DIFF_EVENTS.CLEAR_DIFF, clearHandler);
    };
}
