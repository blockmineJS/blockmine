import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowDown, Trash2, AlertTriangle } from 'lucide-react';
import AnsiToHtml from 'ansi-to-html';
import { useAppStore } from '@/stores/appStore';
import { apiHelper } from '@/lib/api';

const ansiConverter = new AnsiToHtml({
    fg: 'var(--ansi-fg, #e5e7eb)',
    bg: 'var(--ansi-bg, #111827)',
    newline: true,
    escapeXML: true,
});

const LogLine = React.memo(({ log }) => {
    const logContent = typeof log === 'object' && log !== null && log.content ? log.content : (typeof log === 'string' ? log : '');
    const htmlContent = useMemo(() => ansiConverter.toHtml(logContent), [logContent]);

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

    const bot = useMemo(() => bots.find(b => b.id === parseInt(botId)), [bots, botId]);
    const logs = useMemo(() => {
        const allLogs = botLogs[botId] || [];
        const maxLogs = allLogs.length > 5000 ? 500 : allLogs.length > 2000 ? 1000 : 2000;
        return allLogs.slice(-maxLogs);
    }, [botLogs, botId]);
    const status = bot ? botStatuses[bot.id] || 'stopped' : 'stopped';

    const [command, setCommand] = useState('');
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
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
        if (!command.trim() || !bot || status !== 'running') return;

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

    useEffect(() => {
        setIsUserScrolledUp(false);
        scrollToBottom();
    }, [botId, scrollToBottom]);

    useEffect(() => {
        if (!isUserScrolledUp && lastLogCount.current !== logs.length) {
            scrollToBottom();
        }
        lastLogCount.current = logs.length;

        if (logs.length > 4000) {
            setShowPerformanceWarning(true);
        } else {
            setShowPerformanceWarning(false);
        }
    }, [logs.length, isUserScrolledUp, scrollToBottom]);

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
                        <LogLine key={log.id} log={log} />
                    ))}
                </div>
            </div>

            <div className="absolute top-2 right-2 flex gap-2">
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
            </div>

            <form onSubmit={handleSendCommand} className="flex-shrink-0 flex items-center gap-2 p-2 bg-muted/50 border-t border-border">
                <Input
                    type="text"
                    placeholder={status === 'running' ? `Отправить как ${bot?.username}...` : 'Запустите бота, чтобы отправлять сообщения'}
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    disabled={status !== 'running'}
                    className="flex-1"
                />
                <Button
                    type="submit"
                    disabled={!command.trim() || status !== 'running'}
                    size="sm"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}