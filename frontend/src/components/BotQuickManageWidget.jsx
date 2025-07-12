import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, Square, MoreHorizontal, RefreshCw, Settings, Terminal } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiHelper } from '@/lib/api';

export default function BotQuickManageWidget({ bots, botStatuses }) {
    const { toast } = useToast();
    const navigate = useNavigate();

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

    return (
        <div className="h-full flex flex-col">
            <div className="mb-4">
                <CardTitle className="text-base font-semibold">Все боты</CardTitle>
                <CardDescription className="text-sm">Быстрое управление состоянием всех ботов в системе</CardDescription>
            </div>
            
            <div className="flex-grow overflow-hidden">
                <div className="border rounded-lg h-full overflow-y-auto bg-background/50">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-muted/30">
                                <TableHead className="font-semibold">Бот</TableHead>
                                <TableHead className="font-semibold">Статус</TableHead>
                                <TableHead className="text-right font-semibold">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bots.map(bot => {
                                const status = botStatuses[bot.id] || 'stopped';
                                const isRunning = status === 'running';
                                return (
                                    <TableRow key={bot.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-medium">{bot.username}</TableCell>
                                        <TableCell>
                                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                                isRunning 
                                                    ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                                                    : 'bg-red-500/10 text-red-600 border border-red-500/20'
                                            }`}>
                                                {isRunning ? 'Запущен' : 'Остановлен'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem 
                                                        disabled={isRunning} 
                                                        onClick={() => handleAction(bot, 'start')}
                                                        className="cursor-pointer"
                                                    >
                                                        <Play className="mr-2 h-4 w-4" />
                                                        Запустить
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        disabled={!isRunning} 
                                                        onClick={() => handleAction(bot, 'stop')} 
                                                        className="text-destructive cursor-pointer"
                                                    >
                                                        <Square className="mr-2 h-4 w-4" />
                                                        Остановить
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        disabled={!isRunning} 
                                                        onClick={() => handleAction(bot, 'restart')}
                                                        className="cursor-pointer"
                                                    >
                                                        <RefreshCw className="mr-2 h-4 w-4" />
                                                        Перезапустить
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => navigate(`/bots/${bot.id}/console`)}
                                                        className="cursor-pointer"
                                                    >
                                                        <Terminal className="mr-2 h-4 w-4" />
                                                        Консоль
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => navigate(`/bots/${bot.id}/settings`)}
                                                        className="cursor-pointer"
                                                    >
                                                        <Settings className="mr-2 h-4 w-4" />
                                                        Настройки
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}