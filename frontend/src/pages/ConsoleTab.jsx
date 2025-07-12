import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowDown } from 'lucide-react';
import AnsiToHtml from 'ansi-to-html';
import { useAppStore } from '@/stores/appStore';
import { apiHelper } from '@/lib/api';

const ansiConverter = new AnsiToHtml({
    fg: 'var(--ansi-fg, #e5e7eb)',
    bg: 'var(--ansi-bg, #111827)',
    newline: true,
    escapeXML: true,
});

const LogLine = React.memo(({ log, index }) => {
    const logContent = typeof log === 'object' && log !== null && log.content ? log.content : (typeof log === 'string' ? log : '');
    const htmlContent = useMemo(() => ansiConverter.toHtml(logContent), [logContent]);
    
    return (
        <div className="log-line leading-relaxed whitespace-pre-wrap break-all">
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
    const logs = useMemo(() => botLogs[botId] || [], [botLogs, botId]);
    const status = bot ? botStatuses[bot.id] || 'stopped' : 'stopped';

    const [command, setCommand] = useState('');
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const logContainerRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        if (!isUserScrolledUp) {
            requestAnimationFrame(scrollToBottom);
        }
    }, [logs, isUserScrolledUp, scrollToBottom]);

    const handleScroll = useCallback(() => {
        if (logContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
            const isAtBottom = scrollHeight - clientHeight <= scrollTop + 1;
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
            scrollToBottom();
        } catch (error) {
            console.error("Failed to send command:", error);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background rounded-lg border border-border relative">
            <div 
                ref={logContainerRef} 
                onScroll={handleScroll}
                className="flex-1 p-4 overflow-y-auto font-mono text-sm"
                style={{ '--ansi-fg': 'hsl(var(--foreground))', '--ansi-bg': 'hsl(var(--background))' }}
            >
                {logs.map((log, index) => (
                    <LogLine key={log.id || index} log={log} index={index} />
                ))}
            </div>
            
            {isUserScrolledUp && (
                <Button 
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-8 rounded-full h-10 w-10 p-2"
                    variant="secondary"
                >
                    <ArrowDown />
                </Button>
            )}

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
                    disabled={status !== 'running' || !command.trim()}
                >
                    <Send />
                </Button>
            </form>
        </div>
    );
}

