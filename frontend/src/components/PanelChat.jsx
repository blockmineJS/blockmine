import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, Edit2, Trash2, Check, XCircle, ArrowDown, Maximize2, Minimize2, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';

export default function PanelChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [newMessagesCount, setNewMessagesCount] = useState(0);
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem('panel-chat-expanded');
        return saved === 'true';
    });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('panel-chat-position');
        if (saved) {
            return JSON.parse(saved);
        }
        // Default position - учитываем размер экрана
        const isMobile = window.innerWidth < 768;
        return isMobile ? { bottom: 16, right: 16 } : { bottom: 24, right: 24 };
    });
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const longPressTimerRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const socket = useAppStore(state => state.socket);
    const token = useAppStore(state => state.token);
    const currentUser = useAppStore(state => state.user);
    const unreadCount = useAppStore(state => state.chatUnreadCount);
    const setChatUnreadCount = useAppStore(state => state.setChatUnreadCount);

    // Сохраняем состояние расширения в localStorage
    useEffect(() => {
        localStorage.setItem('panel-chat-expanded', isExpanded.toString());
    }, [isExpanded]);

    // Сохраняем позицию в localStorage
    useEffect(() => {
        localStorage.setItem('panel-chat-position', JSON.stringify(position));
    }, [position]);

    // Простое перетаскивание без интерполяции
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const deltaX = dragStartRef.current.x - e.clientX;
            const deltaY = dragStartRef.current.y - e.clientY;

            setPosition(prev => {
                const newRight = Math.max(0, Math.min(window.innerWidth - 80, prev.right + deltaX));
                const newBottom = Math.max(0, Math.min(window.innerHeight - 80, prev.bottom + deltaY));

                return {
                    right: newRight,
                    bottom: newBottom
                };
            });

            dragStartRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Cleanup таймера при размонтировании
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    // Загрузка сообщений при открытии чата
    useEffect(() => {
        if (isOpen && token && messages.length === 0) {
            loadMessages();
        }
        // Сбрасываем счетчик непрочитанных и прокручиваем вниз при открытии чата
        if (isOpen) {
            setChatUnreadCount(0);
            // Прокручиваем вниз сразу при открытии
            setTimeout(() => scrollToBottom(true), 200);
        }
    }, [isOpen, token]);

    // Подключение к Socket.io комнате чата
    useEffect(() => {
        if (socket) {
            socket.emit('chat:join');

            // Слушаем новые сообщения
            const handleNewMessage = (message) => {
                setMessages(prev => [...prev, message]);

                // Увеличиваем счетчик непрочитанных, если чат закрыт и сообщение не от текущего пользователя
                if (!isOpen && message.userId !== currentUser?.id) {
                    const currentCount = useAppStore.getState().chatUnreadCount;
                    setChatUnreadCount(currentCount + 1);
                }

                if (isOpen) {
                    // Если пользователь не внизу, увеличиваем счетчик новых сообщений
                    if (!isAtBottom) {
                        setNewMessagesCount(prev => prev + 1);
                    }
                    scrollToBottom();
                }
            };

            // Слушаем редактирование сообщений
            const handleEditMessage = (updatedMessage) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === updatedMessage.id ? updatedMessage : msg
                ));
            };

            // Слушаем удаление сообщений
            const handleDeleteMessage = ({ messageId }) => {
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
            };

            // Слушаем индикатор набора текста
            const handleUserTyping = ({ username, isTyping }) => {
                if (isTyping) {
                    setTypingUsers(prev => new Set([...prev, username]));
                } else {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(username);
                        return newSet;
                    });
                }
            };

            socket.on('chat:new-message', handleNewMessage);
            socket.on('chat:message-edited', handleEditMessage);
            socket.on('chat:message-deleted', handleDeleteMessage);
            socket.on('chat:user-typing', handleUserTyping);

            return () => {
                socket.emit('chat:leave');
                socket.off('chat:new-message', handleNewMessage);
                socket.off('chat:message-edited', handleEditMessage);
                socket.off('chat:message-deleted', handleDeleteMessage);
                socket.off('chat:user-typing', handleUserTyping);
            };
        }
    }, [socket, isOpen, currentUser?.id]);

    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/chat/messages', {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 100 }
            });
            setMessages(response.data);
            // Прокручиваем вниз после загрузки с задержкой для рендеринга
            setTimeout(() => scrollToBottom(true), 300);
        } catch (error) {
            console.error('[Chat] Failed to load messages:', error);
            toast.error('Не удалось загрузить сообщения');
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBottom = (force = false) => {
        if (force || isAtBottom) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                setIsAtBottom(true);
                setShowScrollButton(false);
                setNewMessagesCount(0);
            }, 100);
        }
    };

    const checkIfAtBottom = (element) => {
        if (element) {
            const { scrollTop, scrollHeight, clientHeight } = element;
            const atBottom = scrollHeight - scrollTop - clientHeight < 50;
            setIsAtBottom(atBottom);
            setShowScrollButton(!atBottom);

            // Сбрасываем счетчик новых сообщений если пользователь прокрутил вниз вручную
            if (atBottom) {
                setNewMessagesCount(0);
            }
        }
    };

    const handleScroll = (e) => {
        // ScrollArea использует внутренний viewport
        const viewport = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            checkIfAtBottom(viewport);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !token) return;

        try {
            const response = await axios.post('/api/chat/messages',
                { message: newMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewMessage('');
            handleTyping(false);
            // Всегда скроллим вниз после отправки своего сообщения
            scrollToBottom(true);
        } catch (error) {
            console.error('[Chat] Failed to send message:', error);
            toast.error('Не удалось отправить сообщение');
        }
    };

    const handleEditMessage = async (messageId) => {
        if (!editingText.trim() || !token) return;

        try {
            await axios.put(`/api/chat/messages/${messageId}`,
                { message: editingText },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEditingMessageId(null);
            setEditingText('');
        } catch (error) {
            console.error('[Chat] Failed to edit message:', error);
            toast.error('Не удалось отредактировать сообщение');
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!token) return;

        try {
            await axios.delete(`/api/chat/messages/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('[Chat] Failed to delete message:', error);
            toast.error('Не удалось удалить сообщение');
        }
    };

    const handleTyping = (isTyping) => {
        if (socket) {
            socket.emit('chat:typing', { isTyping });
        }
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        // Отправляем событие "набирает текст"
        if (!typingTimeoutRef.current) {
            handleTyping(true);
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            handleTyping(false);
            typingTimeoutRef.current = null;
        }, 1000);
    };

    const startEditing = (message) => {
        setEditingMessageId(message.id);
        setEditingText(message.message);
    };

    const cancelEditing = () => {
        setEditingMessageId(null);
        setEditingText('');
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const handleLongPressStart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Если чат открыт - просто закрываем при клике
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        dragStartRef.current = { x: e.clientX, y: e.clientY };

        // Обработчик отпускания/отмены на уровне документа
        const handleDocumentMouseUp = () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }

            // Если не начали перетаскивать, открываем чат
            if (!isDragging) {
                setIsOpen(true);
            }

            document.removeEventListener('mouseup', handleDocumentMouseUp);
        };

        document.addEventListener('mouseup', handleDocumentMouseUp);

        longPressTimerRef.current = setTimeout(() => {
            // Активируем режим перетаскивания после 0.6 секунд
            setIsDragging(true);

            // Удаляем обработчики после активации перетаскивания
            document.removeEventListener('mouseup', handleDocumentMouseUp);
        }, 600);
    };

    return (
        <>
            {/* Floating Button */}
            <div
                className="fixed z-50"
                style={{
                    bottom: `${position.bottom}px`,
                    right: `${position.right}px`
                }}
            >
                <Button
                    onMouseDown={handleLongPressStart}
                    onContextMenu={(e) => e.preventDefault()}
                    className={cn(
                        "h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg relative select-none",
                        "transition-all duration-200 ease-out",
                        !isDragging && "hover:scale-110 active:scale-95",
                        isDragging && "cursor-move scale-110"
                    )}
                    size="icon"
                >
                    <div className={cn(
                        "transition-all duration-200",
                        isOpen && "rotate-90"
                    )}>
                        {isOpen ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />}
                    </div>

                    {/* Unread Badge */}
                    {!isOpen && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-5 md:h-6 md:min-w-6 px-1 md:px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-background animate-in zoom-in duration-200">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <Card
                    className={cn(
                        "fixed shadow-2xl flex flex-col overflow-hidden",
                        "transition-all duration-300 ease-out",
                        "animate-in fade-in slide-in-from-bottom-8",
                        isFullscreen ? (
                            // Полноэкранный режим
                            "inset-0 z-50 w-full h-full"
                        ) : (
                            // Обычный режим
                            cn(
                                "z-40 left-0 right-0 bottom-0 md:left-auto",
                                "h-[100dvh] md:h-auto",
                                isExpanded
                                    ? "md:w-[600px] md:h-[min(700px,80vh)] md:max-h-[calc(100vh-7rem)]"
                                    : "md:w-96 md:h-[min(500px,70vh)] md:max-h-[calc(100vh-7rem)]"
                            )
                        )
                    )}
                    style={!isFullscreen ? {
                        bottom: window.innerWidth >= 768 ? `${position.bottom + 80}px` : undefined,
                        right: window.innerWidth >= 768 ? `${position.right}px` : undefined,
                        transform: 'translate3d(0, 0, 0)' // GPU acceleration
                    } : undefined}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 md:p-4 border-b shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
                            <h3 className="font-semibold text-sm md:text-base">Чат панели</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Кнопка "Вниз" */}
                            {showScrollButton && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => scrollToBottom(true)}
                                    className={cn(
                                        "h-8 w-8 transition-all duration-200",
                                        "hover:scale-110 active:scale-95",
                                        "bg-primary/10 hover:bg-primary/20 text-primary",
                                        "relative"
                                    )}
                                >
                                    <ArrowDown className="h-4 w-4 animate-bounce" />
                                    {newMessagesCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border border-background">
                                            {newMessagesCount > 99 ? '99+' : newMessagesCount}
                                        </span>
                                    )}
                                </Button>
                            )}

                            {/* Кнопка расширения (средний размер) */}
                            {!isFullscreen && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="hidden md:flex h-8 w-8 transition-transform hover:scale-110"
                                >
                                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                            )}

                            {/* Кнопка полноэкранного режима */}
                            {isExpanded && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="hidden md:flex h-8 w-8 transition-transform hover:scale-110"
                                >
                                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                </Button>
                            )}

                            {/* Кнопка закрытия */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsFullscreen(false);
                                }}
                                className="h-8 w-8 transition-transform hover:scale-110"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 relative min-h-0">
                        <ScrollArea className="h-full p-2 md:p-4" onScrollCapture={handleScroll}>
                                {isLoading ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        Загрузка сообщений...
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        Нет сообщений. Начните общение!
                                    </div>
                                ) : (
                                    <div className="space-y-3 md:space-y-4">
                                        {messages.map((message) => {
                                    const isOwnMessage = message.userId === currentUser?.id;
                                    const isEditing = editingMessageId === message.id;

                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex flex-col gap-0.5 md:gap-1",
                                                isOwnMessage ? "items-end" : "items-start"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                                                <span className="font-medium">{message.user.username}</span>
                                                <span>{formatTime(message.createdAt)}</span>
                                                {message.isEdited && <span>(изменено)</span>}
                                            </div>

                                            {isEditing ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <Input
                                                        value={editingText}
                                                        onChange={(e) => setEditingText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleEditMessage(message.id);
                                                            } else if (e.key === 'Escape') {
                                                                cancelEditing();
                                                            }
                                                        }}
                                                        className="flex-1"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleEditMessage(message.id)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={cancelEditing}
                                                        className="h-8 w-8"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="group relative max-w-[85%] md:max-w-xs">
                                                    <div
                                                        className={cn(
                                                            "px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg break-words whitespace-pre-wrap overflow-wrap-anywhere text-sm md:text-base",
                                                            isOwnMessage
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted"
                                                        )}
                                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                                    >
                                                        {message.message}
                                                    </div>

                                                    {isOwnMessage && (
                                                        <div className="absolute -top-8 right-0 hidden group-hover:flex gap-1 bg-background border rounded-md shadow-md p-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => startEditing(message)}
                                                                className="h-6 w-6"
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteMessage(message.id)}
                                                                className="h-6 w-6 text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}

                            {/* Typing Indicator */}
                            {typingUsers.size > 0 && (
                                <div className="text-[10px] md:text-xs text-muted-foreground italic mt-2">
                                    {Array.from(typingUsers).join(', ')} набирает...
                                </div>
                            )}
                    </ScrollArea>

                </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-2 md:p-4 border-t shrink-0">
                        <div className="flex items-center gap-2">
                            <Input
                                value={newMessage}
                                onChange={handleInputChange}
                                placeholder="Введите сообщение..."
                                className="flex-1 text-sm md:text-base"
                                maxLength={2000}
                            />
                            <Button type="submit" size="icon" disabled={!newMessage.trim()} className="shrink-0">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </Card>
            )}
        </>
    );
}
