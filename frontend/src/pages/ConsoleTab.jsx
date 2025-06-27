import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
    const logs = useMemo(() => {
        const botLog = botLogs[botId] || [];
        if (botLog.length > 0 && typeof botLog[0] === 'object' && botLog[0] !== null && 'id' in botLog[0]) {
            return [...botLog].sort((a, b) => a.id - b.id);
        }
        return botLog;
    }, [botLogs, botId]);
    const status = bot ? botStatuses[bot.id] || 'stopped' : 'stopped';

    const [command, setCommand] = useState('');
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

    const listRef = useRef(null);
    const rowHeights = useRef({});

    const getRowHeight = index => rowHeights.current[index] || 25; // Default height

    // Using useCallback to avoid re-creating the function on every render
    const setRowHeight = useCallback((index, size) => {
        if (rowHeights.current[index] !== size) {
            rowHeights.current[index] = size;
            // Purge cache to recalculate heights
            if (listRef.current) {
                listRef.current.resetAfterIndex(index);
            }
        }
    }, []);

    useEffect(() => {
        if (!isUserScrolledUp && listRef.current) {
            listRef.current.scrollToItem(logs.length - 1, 'end');
        }
    }, [logs.length, isUserScrolledUp]); // Trigger on new logs

    const handleScroll = ({ scrollOffset }) => {
        if (listRef.current && listRef.current._outerRef) {
            const outerElement = listRef.current._outerRef;
            const { scrollHeight, clientHeight } = outerElement;
            const isAtBottom = scrollOffset >= scrollHeight - clientHeight - 1;
            setIsUserScrolledUp(!isAtBottom);
        }
    };

    const scrollToBottom = () => {
        if (listRef.current) {
            listRef.current.scrollToItem(logs.length - 1, 'end');
        }
    };

    const LogRow = ({ index, style }) => {
        const rowRef = useRef(null);
        const log = logs[index];

        useEffect(() => {
            if (rowRef.current) {
                setRowHeight(index, rowRef.current.scrollHeight);
            }
        }, [log, index, setRowHeight]);

        const logContent = typeof log === 'object' && log !== null && log.content ? log.content : (typeof log === 'string' ? log : '');

        return (
            <div style={style}>
                <div ref={rowRef} className="leading-relaxed whitespace-pre-wrap break-all">
                    <div dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(logContent) }} />
                </div>
            </div>
        );
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
            if (isUserScrolledUp) {
               // If user is scrolled up, don't force scroll down
            } else {
               scrollToBottom();
            }
        } catch (error) {
            console.error("Failed to send command:", error);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background rounded-lg border border-border relative">
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-black">
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            ref={listRef}
                            height={height}
                            itemCount={logs.length}
                            itemSize={getRowHeight}
                            width={width}
                            onScroll={handleScroll}
                        >
                            {LogRow}
                        </List>
                    )}
                </AutoSizer>
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
