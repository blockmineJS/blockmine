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
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Все боты</CardTitle>
                <CardDescription>Быстрое управление состоянием всех ботов в системе.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <div className="border rounded-lg h-full overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Бот</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bots.map(bot => {
                                const status = botStatuses[bot.id] || 'stopped';
                                const isRunning = status === 'running';
                                return (
                                    <TableRow key={bot.id}>
                                        <TableCell className="font-medium">{bot.username}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded-md ${isRunning ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                                {status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem disabled={isRunning} onClick={() => handleAction(bot, 'start')}><Play className="mr-2"/>Запустить</DropdownMenuItem>
                                                    <DropdownMenuItem disabled={!isRunning} onClick={() => handleAction(bot, 'stop')} className="text-destructive"><Square className="mr-2"/>Остановить</DropdownMenuItem>
                                                    <DropdownMenuItem disabled={!isRunning} onClick={() => handleAction(bot, 'restart')}><RefreshCw className="mr-2"/>Перезапустить</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/bots/${bot.id}/console`)}><Terminal className="mr-2"/>Консоль</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/bots/${bot.id}/settings`)}><Settings className="mr-2"/>Настройки</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}