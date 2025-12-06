import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sparkles,
    MessageSquare,
    RefreshCw,
    Bug,
    Code,
    FileText,
    TestTube,
    X,
    Loader2,
    Copy,
    Check,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Быстрые действия для inline AI
 */
const QUICK_ACTIONS = [
    { id: 'explain', label: 'Объяснить', icon: MessageSquare, shortcut: 'E' },
    { id: 'refactor', label: 'Улучшить', icon: RefreshCw, shortcut: 'R' },
    { id: 'fix', label: 'Исправить', icon: Bug, shortcut: 'F' },
    { id: 'complete', label: 'Продолжить', icon: Code, shortcut: 'C' },
    { id: 'comment', label: 'Комментарии', icon: FileText, shortcut: 'M' },
    { id: 'test', label: 'Тесты', icon: TestTube, shortcut: 'T' }
];

/**
 * Компонент командной палитры AI
 */
export function AICommandPalette({
    isOpen,
    position,
    context,
    isLoading,
    result,
    error,
    onClose,
    onSendRequest,
    onApplyResult,
    actions
}) {
    const [input, setInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Фокус на input при открытии
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        if (result) {
            setShowResult(true);
        } else {
            setShowResult(false);
        }
    }, [result]);

    useEffect(() => {
        if (!isOpen) {
            setShowResult(false);
        }
    }, [isOpen]);


    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                e.preventDefault();
                handleSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, input, onClose, handleSubmit]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleSubmit = useCallback(async () => {
        if (!input.trim() || isLoading) return;
        try {
            await onSendRequest(input);
            setInput('');
        } catch (err) {
            console.error('Ошибка отправки запроса:', err);
        }
    }, [input, isLoading, onSendRequest]);

    const handleQuickAction = async (actionId) => {
        if (isLoading) return;
        if (actions && actions[actionId]) {
            try {
                await actions[actionId]();
            } catch (err) {
                console.error('Ошибка выполнения действия:', err);
            }
        }
    };

    const handleCopyResult = () => {
        if (result) {
            navigator.clipboard.writeText(result)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(err => {
                    console.error('Не удалось скопировать:', err);
                });
        }
    };

    const handleApply = () => {
        if (result && onApplyResult) {
            onApplyResult(result);
            onClose();
        }
    };

    if (!isOpen) return null;

    // Вычисляем позицию с учётом границ экрана
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const style = {
        position: 'fixed',
        left: Math.max(0, Math.min(position.x, viewportWidth - 400)),
        top: Math.max(0, Math.min(position.y, viewportHeight - 300)),
        zIndex: 9999
    };

    return (
        <div
            ref={containerRef}
            style={style}
            className="w-96 bg-background border rounded-lg shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium flex-1">AI Помощник</span>
                {context.selectedText && (
                    <span className="text-xs text-muted-foreground">
                        {context.selectedText.length} символов выделено
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Quick Actions */}
            {!showResult && (
                <div className="flex flex-wrap gap-1 p-2 border-b">
                    {QUICK_ACTIONS.map(action => (
                        <Button
                            key={action.id}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 gap-1 text-xs",
                                isLoading && "opacity-50 pointer-events-none"
                            )}
                            onClick={() => handleQuickAction(action.id)}
                            disabled={isLoading}
                        >
                            <action.icon className="h-3 w-3" />
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}

            {/* Input */}
            {!showResult && (
                <div className="p-2 border-b">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Что нужно сделать с кодом?"
                            disabled={isLoading}
                            className="flex-1 h-8 text-sm"
                        />
                        <Button
                            size="sm"
                            className="h-8"
                            onClick={handleSubmit}
                            disabled={isLoading || !input.trim()}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ArrowRight className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Обработка...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10">
                    {error}
                </div>
            )}

            {/* Result */}
            {showResult && result && (
                <div className="flex flex-col">
                    {/* Result Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-green-500/10">
                        <span className="text-xs font-medium text-green-600">Результат</span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 text-xs"
                                onClick={handleCopyResult}
                            >
                                {copied ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                                {copied ? 'Скопировано' : 'Копировать'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setShowResult(false)}
                            >
                                Назад
                            </Button>
                        </div>
                    </div>

                    {/* Result Content */}
                    <div className="max-h-64 overflow-auto p-3">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                            {result}
                        </pre>
                    </div>

                    {/* Apply Button */}
                    {onApplyResult && (
                        <div className="p-2 border-t">
                            <Button
                                className="w-full h-8 gap-2"
                                onClick={handleApply}
                            >
                                <Check className="h-4 w-4" />
                                Применить
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Hint */}
            {!showResult && !isLoading && (
                <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Ctrl+K</kbd>
                    {' '}для открытия • {' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Esc</kbd>
                    {' '}для закрытия
                </div>
            )}
        </div>
    );
}
