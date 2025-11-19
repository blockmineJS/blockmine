import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search,
    Trash2,
    Filter,
    ChevronDown,
    Info,
    AlertTriangle,
    XCircle,
    Bug,
    CheckCircle
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/appStore';

const LOG_LEVELS = {
    debug: { icon: Bug, color: 'text-blue-400', label: 'Debug' },
    info: { icon: Info, color: 'text-green-400', label: 'Info' },
    warn: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Warning' },
    error: { icon: XCircle, color: 'text-red-400', label: 'Error' },
    success: { icon: CheckCircle, color: 'text-emerald-400', label: 'Success' }
};

export default function ConsolePanel({ botId, pluginName }) {
    const [logs, setLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const [filters, setFilters] = useState({
        debug: true,
        info: true,
        warn: true,
        error: true,
        success: true
    });
    const scrollRef = useRef(null);
    const socket = useAppStore(state => state.socket);

    // Подписка на логи плагина через WebSocket
    useEffect(() => {
        if (!socket || !botId || !pluginName) return;

        // Очищаем логи при смене плагина (чтобы не было наложения)
        setLogs([]);

        // Приводим botId к числу для сравнения (может прийти как строка из URL)
        const numericBotId = typeof botId === 'string' ? parseInt(botId, 10) : botId;

        // Сохраняем текущий плагин для проверки в обработчиках
        const currentPlugin = pluginName;

        // Подписываемся на логи конкретного плагина
        socket.emit('subscribe-plugin-logs', { botId, pluginName });

        // Обработчик буфера логов (приходит при подключении)
        const handleLogsBuffer = (bufferedLogs) => {
            // Проверяем, что мы всё еще смотрим на тот же плагин
            if (currentPlugin !== pluginName) return;

            const formattedLogs = bufferedLogs
                .filter(logEntry => logEntry.botId === numericBotId && logEntry.pluginName === pluginName)
                .map(logEntry => ({
                    id: Date.now() + Math.random(),
                    timestamp: new Date(logEntry.timestamp || Date.now()),
                    level: logEntry.level || 'info',
                    message: logEntry.message,
                    source: logEntry.source || 'plugin'
                }));

            // Заменяем state буферными логами (не добавляем к существующим)
            setLogs(formattedLogs);
        };

        // Обработчик новых real-time логов
        const handlePluginLog = (logEntry) => {
            // Проверяем, что лог относится к текущему плагину
            if (logEntry.botId === numericBotId && logEntry.pluginName === currentPlugin) {
                setLogs(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    timestamp: new Date(logEntry.timestamp || Date.now()),
                    level: logEntry.level || 'info',
                    message: logEntry.message,
                    source: logEntry.source || 'plugin'
                }]);
            }
        };

        socket.on('plugin-logs-buffer', handleLogsBuffer);
        socket.on('plugin-log', handlePluginLog);

        return () => {
            socket.off('plugin-logs-buffer', handleLogsBuffer);
            socket.off('plugin-log', handlePluginLog);
            socket.emit('unsubscribe-plugin-logs', { botId, pluginName });
        };
    }, [socket, botId, pluginName]);

    // Auto-scroll при новых логах
    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [logs, autoScroll]);

    // Фильтрация логов
    const filteredLogs = logs.filter(log => {
        // Фильтр по уровню
        if (!filters[log.level]) return false;

        // Фильтр по поиску
        if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        return true;
    });

    const clearLogs = () => {
        setLogs([]);
        // Очищаем также буфер на сервере
        if (socket && botId && pluginName) {
            socket.emit('clear-plugin-logs', { botId, pluginName });
        }
    };

    const toggleFilter = (level) => {
        setFilters(prev => ({
            ...prev,
            [level]: !prev[level]
        }));
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    };

    const LogEntry = ({ log }) => {
        const LevelIcon = LOG_LEVELS[log.level]?.icon || Info;
        const levelColor = LOG_LEVELS[log.level]?.color || 'text-gray-400';

        return (
            <div className="flex items-start gap-2 px-3 py-1 hover:bg-slate-800/50 font-mono text-xs border-b border-slate-800/50">
                <span className="text-slate-500 flex-shrink-0 w-24">
                    {formatTime(log.timestamp)}
                </span>
                <LevelIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${levelColor}`} />
                <span className="flex-1 break-all whitespace-pre-wrap">
                    {log.message}
                </span>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск в логах..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>

                {/* Filter dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                            <Filter className="w-4 h-4 mr-1" />
                            Фильтр
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {Object.entries(LOG_LEVELS).map(([level, { label, color, icon: Icon }]) => (
                            <DropdownMenuCheckboxItem
                                key={level}
                                checked={filters[level]}
                                onCheckedChange={() => toggleFilter(level)}
                            >
                                <Icon className={`w-4 h-4 mr-2 ${color}`} />
                                {label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Auto-scroll toggle */}
                <Button
                    variant={autoScroll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className="h-8"
                    title="Автопрокрутка"
                >
                    <ChevronDown className="w-4 h-4" />
                </Button>

                {/* Clear logs */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLogs}
                    className="h-8"
                    title="Очистить логи"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Logs area */}
            <ScrollArea ref={scrollRef} className="flex-1">
                <div className="min-h-full">
                    {filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
                            <div className="text-center">
                                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">
                                    {logs.length === 0 ? 'Ожидание логов...' : 'Нет логов по заданным фильтрам'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {filteredLogs.map((log) => (
                                <LogEntry key={log.id} log={log} />
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer stats */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-slate-700 text-xs text-muted-foreground">
                <span>
                    Всего логов: {logs.length} | Отображается: {filteredLogs.length}
                </span>
                <span className="flex items-center gap-1">
                    {Object.entries(filters).filter(([_, enabled]) => enabled).length} / {Object.keys(filters).length} фильтров
                </span>
            </div>
        </div>
    );
}
