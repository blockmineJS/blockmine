import { useState, useCallback, useRef } from 'react';

/**
 * Hook для управления прикреплёнными файлами в чате
 */
export function useAttachments() {
    const [attachments, setAttachments] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    const dragCounterRef = useRef(0);

    /**
     * Добавить вложение
     */
    const addAttachment = useCallback((file) => {
        const newAttachment = {
            id: `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            name: file.name,
            path: file.path || file.name,
            content: file.content || '',
            preview: file.content ? file.content.slice(0, 100) : '',
            type: file.type || 'file'
        };

        setAttachments(prev => {
            if (prev.some(a => a.path === newAttachment.path)) {
                return prev;
            }
            return [...prev, newAttachment];
        });

        return newAttachment.id;
    }, []);

    /**
     * Добавить несколько вложений
     */
    const addAttachments = useCallback((files) => {
        files.forEach(file => addAttachment(file));
    }, [addAttachment]);

    /**
     * Удалить вложение
     */
    const removeAttachment = useCallback((attachmentId) => {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    }, []);

    /**
     * Очистить все вложения
     */
    const clearAttachments = useCallback(() => {
        setAttachments([]);
    }, []);

    /**
     * Получить контент всех вложений для отправки в AI
     */
    const getAttachmentsContext = useCallback(() => {
        if (attachments.length === 0) return '';

        return attachments
            .map(a => `\n=== Файл: ${a.path} ===\n${a.content}`)
            .join('\n');
    }, [attachments]);

    /**
     * Получить список путей вложенных файлов
     */
    const getAttachmentPaths = useCallback(() => {
        return attachments.map(a => a.path);
    }, [attachments]);

    /**
     * Обработчики drag & drop
     */
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current += 1;

        if (dragCounterRef.current === 1) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current -= 1;

        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e, onGetFileContent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current = 0;
        setIsDragging(false);

        const dataTransfer = e.dataTransfer;

        const customData = dataTransfer.getData('application/json');
        if (customData) {
            try {
                const fileData = JSON.parse(customData);
                if (fileData.path && fileData.name) {
                    if (onGetFileContent) {
                        onGetFileContent(fileData.path)
                            .then(content => {
                                addAttachment({
                                    name: fileData.name,
                                    path: fileData.path,
                                    content: content || '',
                                    type: 'file'
                                });
                            })
                            .catch(err => {
                                console.error('Error getting file content:', err);
                            });
                    } else {
                        addAttachment({
                            name: fileData.name,
                            path: fileData.path,
                            content: '',
                            type: 'file'
                        });
                    }
                }
            } catch (err) {
                console.error('Error parsing drop data:', err);
            }
        }


        const text = dataTransfer.getData('text/plain');
        if (text && !customData) {
            addAttachment({
                name: 'Выделенный код',
                path: 'selected-code',
                content: text,
                type: 'code'
            });
        }
    }, [addAttachment]);

    return {
        attachments,
        isDragging,
        addAttachment,
        addAttachments,
        removeAttachment,
        clearAttachments,
        getAttachmentsContext,
        getAttachmentPaths,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop
    };
}
