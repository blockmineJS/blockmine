import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowDown } from 'lucide-react';
import AnsiToHtml from 'ansi-to-html';
import { useAppStore } from '@/stores/appStore';
import { apiHelper } from '@/lib/api';

const ansiConverter = new AnsiToHtml({
    fg: '#e5e7eb',
    bg: '#111827',
    newline: true,
    escapeXML: true,
});

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

    useEffect(() => {
        if (!isUserScrolledUp && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, isUserScrolledUp]);

    const handleScroll = () => {
        if (logContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
            const isAtBottom = scrollHeight - clientHeight <= scrollTop + 1;
            setIsUserScrolledUp(!isAtBottom);
        }
    };

    const scrollToBottom = () => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    };

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
                className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-black"
            >
                {logs.map((log, index) => {
                    const logContent = typeof log === 'object' && log !== null && log.content ? log.content : (typeof log === 'string' ? log : '');
                    return (
                        <div key={index} className="leading-relaxed whitespace-pre-wrap break-all">
                            <div dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(logContent) }} />
                        </div>
                    );
                })}
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
