import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, Square, MoreHorizontal, RefreshCw, Settings, Terminal } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiHelper } from '@/lib/api';
import { FixedSizeList } from 'react-window';

export default function BotQuickManageWidget({ bots, botStatuses }) {
    const { toast } = useToast();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    const handleAction = async (bot, action) => {
        if (action === 'restart') {
            try {
                await apiHelper(`/api/bots/${bot.id}/stop`, { method: 'POST' });
                setTimeout(async () => {
                    await apiHelper(`/api/bots/${bot.id}/start`, { method: 'POST' });
                    toast({ title: "Команда отправлена", description: `Бот ${bot.username} перезапускается.` });
                }, 2000);
            } catch (error) {
            }
            return;
        }
        try {
            await apiHelper(`/api/bots/${bot.id}/${action}`, { method: 'POST' }, `Команда ${action} отправлена боту.`);
        } catch (error) {
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver(() => {
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                setSize({ width: container.offsetWidth, height: container.offsetHeight });
            }
        });
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    const Row = useCallback(({ index, style }) => {
        const bot = bots[index];
        if (!bot) return null;
        const status = botStatuses[bot.id] || 'stopped';
        const isRunning = status === 'running';

        return (
            <div style={style} className="flex items-center px-4 border-b transition-colors hover:bg-muted/20 w-full">
                <div className="flex-1 font-medium truncate pr-4">{bot.username}</div>
                <div className="flex-1">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        isRunning 
                            ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    }`}>
                        {isRunning ? 'Запущен' : 'Остановлен'}
                    </span>
                </div>
                <div className="flex-1 flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem disabled={isRunning} onClick={() => handleAction(bot, 'start')} className="cursor-pointer">
                                <Play className="mr-2 h-4 w-4" />
                                Запустить
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!isRunning} onClick={() => handleAction(bot, 'stop')} className="text-destructive cursor-pointer">
                                <Square className="mr-2 h-4 w-4" />
                                Остановить
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!isRunning} onClick={() => handleAction(bot, 'restart')} className="cursor-pointer">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Перезапустить
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/bots/${bot.id}/console`)} className="cursor-pointer">
                                <Terminal className="mr-2 h-4 w-4" />
                                Консоль
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/bots/${bot.id}/settings`)} className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                Настройки
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    }, [bots, botStatuses, navigate, handleAction]);

    return (
        <div className="h-full flex flex-col">
            <div className="mb-4">
                <CardTitle className="text-base font-semibold">Все боты</CardTitle>
                <CardDescription className="text-sm">Быстрое управление состоянием всех ботов в системе</CardDescription>
            </div>
            
            <div className="flex-grow overflow-hidden border rounded-lg bg-background/50 flex flex-col">
                <div className="flex items-center px-4 py-2 bg-muted/50 border-b shrink-0">
                    <div className="flex-1 font-semibold text-sm text-muted-foreground">Бот</div>
                    <div className="flex-1 font-semibold text-sm text-muted-foreground">Статус</div>
                    <div className="flex-1 text-right font-semibold text-sm text-muted-foreground">Действия</div>
                </div>

                <div className="flex-grow" ref={containerRef}>
                    {size.width > 0 && bots.length > 0 && (
                        <FixedSizeList
                            height={size.height}
                            width={size.width}
                            itemCount={bots.length}
                            itemSize={56}
                            overscanCount={5}
                        >
                            {Row}
                        </FixedSizeList>
                    )}
                    {bots.length === 0 && (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Боты не найдены.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}