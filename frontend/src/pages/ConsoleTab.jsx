import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Send, ArrowDown, Trash2, AlertTriangle } from 'lucide-react';
import AnsiToHtml from 'ansi-to-html';
import { useAppStore } from '@/stores/appStore';
import { apiHelper } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ansiConverter = new AnsiToHtml({
    fg: 'var(--ansi-fg, #e5e7eb)',
    bg: 'var(--ansi-bg, #111827)',
    newline: true,
    escapeXML: true,
});

const stripGradientCodes = (text) => {
    return text
        .replace(/\u001b\[(38|48);2;\d{1,3};\d{1,3};\d{1,3}m/g, '')
        .replace(/\u001b\[(38|48);5;\d{1,3}m/g, '')
        .replace(/\u001b\[[0-9]m/g, '');
};

const LogLine = React.memo(({ log, gradientEnabled }) => {
    const logContent = typeof log === 'object' && log !== null && log.content ? log.content : (typeof log === 'string' ? log : '');
    const processedContent = gradientEnabled ? logContent : stripGradientCodes(logContent);
    const htmlContent = useMemo(() => ansiConverter.toHtml(processedContent), [processedContent]);

    return (
        <div className="log-line leading-relaxed whitespace-pre-wrap break-all px-4 py-1">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
    );
});

LogLine.displayName = 'LogLine';

export default function ConsoleTab() {
    const { botId } = useParams();
    const bots = useAppStore(state => state.bots);
    const botLogs = useAppStore(state => state.botLogs);
    const botStatuses = useAppStore(state => state.botStatuses);
    const hasPermission = useAppStore(state => state.hasPermission);

    const bot = useMemo(() => bots.find(b => b.id === parseInt(botId)), [bots, botId]);
    
    const logs = useMemo(() => {
        const allLogs = botLogs[botId] || [];
        const maxLogs = allLogs.length > 1000 ? 200 : allLogs.length > 500 ? 300 : 500;
        return allLogs.slice(-maxLogs);
    }, [botLogs, botId]);
    
    const status = bot ? botStatuses[bot.id] || 'stopped' : 'stopped';
    const canInteract = hasPermission('bot:interact');

    const [command, setCommand] = useState('');
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
const [gradientEnabled, setGradientEnabled] = useState(() => {
    const saved = localStorage.getItem(`bot_${botId}_gradient`);
    if (saved !== null) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            // Malformed data, fallback to default
            return true;
        }
    }
    return true;
});
    const logContainerRef = useRef(null);
    const lastLogCount = useRef(0);

    const scrollToBottom = useCallback(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, []);

    const handleScroll = useCallback(() => {
        if (logContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
            const isAtBottom = scrollHeight - clientHeight <= scrollTop + 5;
            setIsUserScrolledUp(!isAtBottom);
        }
    }, []);

    const handleSendCommand = async (e) => {
        e.preventDefault();
        if (!canInteract || !command.trim() || !bot || status !== 'running') return;

        try {
            await apiHelper(`/api/bots/${bot.id}/chat`, {
                method: 'POST',
                body: JSON.stringify({ message: command }),
            });
            setCommand('');
            setIsUserScrolledUp(false);
        } catch (error) {
            console.error("Failed to send command:", error);
        }
    };

    const clearLogs = useCallback(() => {
        useAppStore.setState(state => {
            if (state.botLogs[botId]) {
                state.botLogs[botId] = [];
            }
        });
        setShowPerformanceWarning(false);
    }, [botId]);

    const handleGradientToggle = useCallback((checked) => {
        setGradientEnabled(checked);
        localStorage.setItem(`bot_${botId}_gradient`, JSON.stringify(checked));
    }, [botId]);

    useEffect(() => {
        setIsUserScrolledUp(false);
        scrollToBottom();
        const saved = localStorage.getItem(`bot_${botId}_gradient`);
        setGradientEnabled(saved !== null ? JSON.parse(saved) : true);
    }, [botId, scrollToBottom]);

    useEffect(() => {
        if (!isUserScrolledUp && lastLogCount.current !== logs.length) {
            scrollToBottom();
        }
        lastLogCount.current = logs.length;

        const allLogsForBot = botLogs[botId] || [];
        if (allLogsForBot.length > 800) {
            setShowPerformanceWarning(true);
        } else {
            setShowPerformanceWarning(false);
        }
    }, [logs.length, botLogs, botId, isUserScrolledUp, scrollToBottom]);

    return (
        <div className="flex flex-col h-full w-full bg-background rounded-lg border border-border relative">
            <div
                className="flex-1 overflow-hidden"
                style={{ '--ansi-fg': 'hsl(var(--foreground))', '--ansi-bg': 'hsl(var(--background))' }}
            >
                <div
                    ref={logContainerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto font-mono text-sm"
                >
                    {logs.map((log) => (
                        <LogLine key={log.id} log={log} gradientEnabled={gradientEnabled} />
                    ))}
                </div>
            </div>

            <div className="absolute top-2 right-2 md:right-6 flex items-center gap-2">
                {showPerformanceWarning && (
                    <Button
                        className="rounded-full h-8 w-8 p-0 bg-yellow-500 hover:bg-yellow-600 text-white"
                        variant="secondary"
                        size="sm"
                        title={`Большое количество логов может снизить производительность. Очистите логи для улучшения.`}
                    >
                        <AlertTriangle className="h-4 w-4" />
                    </Button>
                )}
                {isUserScrolledUp && (
                    <Button
                        onClick={() => {
                            scrollToBottom();
                            setIsUserScrolledUp(false);
                        }}
                        className="rounded-full h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white"
                        variant="secondary"
                        size="sm"
                        title="Прокрутить вниз"
                    >
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                )}
                <Button
                    onClick={clearLogs}
                    className="rounded-full h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white"
                    variant="secondary"
                    size="sm"
                    title="Очистить консоль"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 shadow-sm">
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">Градиент</span>
                    <Switch
                        checked={gradientEnabled}
                        onCheckedChange={handleGradientToggle}
                        className="scale-75"
                    />
                </div>
            </div>

            <form onSubmit={handleSendCommand} className="flex-shrink-0 flex flex-col gap-2 p-2 bg-muted/50 border-t border-border">
                {!canInteract && (
                    <div className="text-xs text-muted-foreground px-1">Режим просмотра: отправка команд недоступна</div>
                )}
                <div className="flex items-center gap-2">
                <Input
                    type="text"
                    placeholder={status === 'running' ? `Отправить как ${bot?.username}...` : 'Запустите бота, чтобы отправлять сообщения'}
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    disabled={status !== 'running' || !canInteract}
                    className="flex-1"
                />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>
                <Button
                    type="submit"
                                    disabled={!command.trim() || status !== 'running' || !canInteract}
                    size="sm"
                >
                    <Send className="h-4 w-4" />
                </Button>
                            </span>
                        </TooltipTrigger>
                        {!canInteract && (
                            <TooltipContent>Недостаточно прав для отправки команд</TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
                </div>
            </form>
        </div>
    );
}
