import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';
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
    const viewportRef = useRef(null);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (viewport && !isUserScrolledUp) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [logs, isUserScrolledUp]);

    const handleScroll = () => {
        const viewport = viewportRef.current;
        if (viewport) {
            const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 10;
            setIsUserScrolledUp(!isAtBottom);
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
            setIsUserScrolledUp(false);
        } catch (error) {
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background rounded-lg border border-border">
            <div
                ref={viewportRef}
                onScroll={handleScroll}
                className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-black"
            >
                <div className="space-y-1">
                    {logs.map((log, index) => (
                        <div 
                            key={`${index}-${log.substring(0, 10)}`}
                            dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(log) }}
                            className="leading-relaxed whitespace-pre-wrap break-all"
                        />
                    ))}
                </div>
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
                    disabled={status !== 'running' || !command.trim()}
                >
                    <Send />
                </Button>
            </form>
        </div>
    );
}