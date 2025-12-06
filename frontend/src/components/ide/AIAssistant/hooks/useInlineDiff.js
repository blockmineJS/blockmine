import { useState, useCallback, useRef, useEffect } from 'react';
import * as Diff from 'diff';

/**
 * Hook для отображения inline diff в Monaco Editor
 * Показывает изменения прямо в редакторе с подсветкой и кнопками Accept/Reject
 */
export function useInlineDiff() {
    const [activeDiffs, setActiveDiffs] = useState({});
    const decorationsRef = useRef({});
    const widgetsRef = useRef({});

    const keydownCleanupFunctionsRef = useRef([]);

    useEffect(() => {
        return () => {
            keydownCleanupFunctionsRef.current.forEach(cleanup => {
                try {
                    cleanup();
                } catch (e) {
                }
            });
            keydownCleanupFunctionsRef.current = [];
        };
    }, []);

    /**
     * Вычислить diff между старым и новым контентом
     */
    const computeDiff = useCallback((oldContent, newContent) => {
        const changes = Diff.diffLines(oldContent || '', newContent || '');

        const result = {
            hunks: [],
            addedLines: [],
            removedLines: [],
            modifiedRanges: []
        };

        let oldLineNum = 1;
        let newLineNum = 1;

        changes.forEach(change => {
            const lines = change.value.split('\n').filter((_, i, arr) =>
                i < arr.length - 1 || arr[i] !== ''
            );
            const lineCount = lines.length;

            if (change.added) {
                for (let i = 0; i < lineCount; i++) {
                    result.addedLines.push({
                        lineNumber: newLineNum + i,
                        content: lines[i]
                    });
                }
                result.hunks.push({
                    type: 'add',
                    startLine: newLineNum,
                    endLine: newLineNum + lineCount - 1,
                    lines: lines
                });
                newLineNum += lineCount;
            } else if (change.removed) {
                for (let i = 0; i < lineCount; i++) {
                    result.removedLines.push({
                        lineNumber: oldLineNum + i,
                        content: lines[i],
                        displayAtLine: newLineNum
                    });
                }
                result.hunks.push({
                    type: 'remove',
                    startLine: oldLineNum,
                    endLine: oldLineNum + lineCount - 1,
                    displayAtLine: newLineNum,
                    lines: lines
                });
                oldLineNum += lineCount;
            } else {
                oldLineNum += lineCount;
                newLineNum += lineCount;
            }
        });

        return result;
    }, []);

    /**
     * Очистить diff для файла (определяем первым чтобы использовать в showDiff)
     */
    const clearDiffInternal = useCallback((editor, filePath) => {
        if (!editor) return;

        if (decorationsRef.current[filePath]) {
            editor.deltaDecorations(decorationsRef.current[filePath], []);
            delete decorationsRef.current[filePath];
        }

        if (widgetsRef.current[filePath]) {
            widgetsRef.current[filePath].forEach(widget => {
                try {
                    const domNode = widget.getDomNode?.();
                    if (domNode?._cleanup) {
                        domNode._cleanup();
                        const index = keydownCleanupFunctionsRef.current.indexOf(domNode._cleanup);
                        if (index > -1) {
                            keydownCleanupFunctionsRef.current.splice(index, 1);
                        }
                    }
                    editor.removeContentWidget(widget);
                } catch (e) {
                }
            });
            delete widgetsRef.current[filePath];
        }

        // Обновляем состояние
        setActiveDiffs(prev => {
            const newDiffs = { ...prev };
            delete newDiffs[filePath];
            return newDiffs;
        });
    }, []);

    /**
     * Показать diff в редакторе
     * НЕ меняет контент файла - только показывает визуальные индикаторы
     */
    const showDiff = useCallback((editor, monaco, filePath, oldContent, newContent, onAccept, onReject) => {
        if (!editor || !monaco) return;

        // Сначала очистим предыдущий diff для этого файла
        clearDiffInternal(editor, filePath);

        const diff = computeDiff(oldContent, newContent);
        const decorations = [];
        const model = editor.getModel();

        // НЕ меняем контент - только показываем виджет с кнопками Accept/Reject
        // и индикатор что есть pending изменения

        // Создаём виджет с превью изменений и кнопками
        const actionWidget = createPreviewWidget(
            monaco,
            filePath,
            oldContent,
            newContent,
            diff,
            () => {
                clearDiffInternal(editor, filePath);
                if (model) {
                    model.setValue(newContent);
                }
                onAccept?.(filePath, newContent);
            },
            () => {
                clearDiffInternal(editor, filePath);
                onReject?.(filePath);
            }
        );

        editor.addContentWidget(actionWidget);

        if (!widgetsRef.current[filePath]) {
            widgetsRef.current[filePath] = [];
        }
        widgetsRef.current[filePath].push(actionWidget);

        const domNode = actionWidget.getDomNode?.();
        if (domNode?._cleanup) {
            keydownCleanupFunctionsRef.current.push(domNode._cleanup);
        }

        setActiveDiffs(prev => ({
            ...prev,
            [filePath]: {
                oldContent,
                newContent,
                diff
            }
        }));

    }, [computeDiff, clearDiffInternal]);

    /**
     * Очистить все diff-ы
     */
    const clearAllDiffs = useCallback((editor) => {
        Object.keys(activeDiffs).forEach(filePath => {
            clearDiffInternal(editor, filePath);
        });
    }, [activeDiffs, clearDiffInternal]);

    /**
     * Проверить есть ли активный diff для файла
     */
    const hasDiff = useCallback((filePath) => {
        return !!activeDiffs[filePath];
    }, [activeDiffs]);

    return {
        activeDiffs,
        showDiff,
        clearDiff: clearDiffInternal,
        clearAllDiffs,
        hasDiff,
        computeDiff
    };
}

/**
 * Создать виджет с превью изменений и кнопками Accept/Reject
 */
function createPreviewWidget(monaco, filePath, oldContent, newContent, diff, onAccept, onReject) {
    const widgetId = `diff-preview-${filePath}-${Date.now()}`;

    const addedCount = diff.addedLines.length;
    const removedCount = diff.removedLines.length;

    return {
        getId: () => widgetId,
        getDomNode: () => {
            const container = document.createElement('div');
            container.className = 'diff-preview-widget';

            let diffPreviewHtml = '';
            const maxLinesToShow = 8;
            let linesShown = 0;

            diff.hunks.forEach(hunk => {
                if (linesShown >= maxLinesToShow) return;

                hunk.lines.slice(0, maxLinesToShow - linesShown).forEach(line => {
                    if (linesShown >= maxLinesToShow) return;
                    const prefix = hunk.type === 'add' ? '+' : '-';
                    const className = hunk.type === 'add' ? 'diff-line-add' : 'diff-line-remove';
                    diffPreviewHtml += `<div class="${className}">${prefix} ${escapeHtml(line)}</div>`;
                    linesShown++;
                });
            });

            const moreLines = (addedCount + removedCount) - linesShown;

            container.innerHTML = `
                <div class="diff-preview-container">
                    <div class="diff-preview-header">
                        <span class="diff-preview-title">AI предлагает изменения</span>
                        <span class="diff-preview-stats">
                            ${addedCount > 0 ? `<span class="stat-add">+${addedCount}</span>` : ''}
                            ${removedCount > 0 ? `<span class="stat-remove">-${removedCount}</span>` : ''}
                        </span>
                    </div>
                    <div class="diff-preview-content">
                        ${diffPreviewHtml}
                        ${moreLines > 0 ? `<div class="diff-preview-more">... ещё ${moreLines} строк</div>` : ''}
                    </div>
                    <div class="diff-preview-actions">
                        <button class="diff-accept-btn" title="Применить изменения (Ctrl+Enter)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Применить
                        </button>
                        <button class="diff-reject-btn" title="Отклонить изменения (Escape)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Отклонить
                        </button>
                    </div>
                </div>
            `;

            const acceptBtn = container.querySelector('.diff-accept-btn');
            const rejectBtn = container.querySelector('.diff-reject-btn');

            acceptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onAccept();
            });

            rejectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onReject();
            });

            const handleKeyDown = (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    onAccept();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onReject();
                }
            };
            document.addEventListener('keydown', handleKeyDown);

            container._cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
            };

            return container;
        },
        getPosition: () => ({
            position: { lineNumber: 1, column: 1 },
            preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
        })
    };
}

/**
 * Escape HTML для безопасного отображения
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
