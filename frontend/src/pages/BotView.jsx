import React, { useState, useMemo } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Play, Square, Settings, Puzzle, Terminal, Trash2, Users, Download, Loader2, Zap, Server, Sparkles } from 'lucide-react';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ExportBotDialog from '@/components/ExportBotDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

export default function BotView() {
    const { botId } = useParams();
    const navigate = useNavigate();
    
    if (!botId) {
        return null;
    }

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const startBot = useAppStore(state => state.startBot);
    const stopBot = useAppStore(state => state.stopBot);
    const deleteBot = useAppStore(state => state.deleteBot);
    const hasPermission = useAppStore(state => state.hasPermission);

    const bot = useMemo(() => {
        return bots.find(b => b.id === parseInt(botId));
    }, [bots, botId]);

    const handleDeleteConfirm = async () => {
        if (!bot) return;
        try {
            await deleteBot(bot.id);
            navigate('/', { replace: true });
        } catch (e) {
            console.error("Не удалось удалить бота:", e);
        }
    };

    if (!bot) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Загрузка данных бота...
            </div>
        );
    }

    const isRunning = botStatuses[bot.id] === 'running';

    return (
        <>
            <div className="flex flex-col h-full w-full overflow-hidden">
                <header className="shrink-0 p-6 bg-gradient-to-br from-background via-muted/20 to-background border-b">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-20" />
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                                <Server className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {bot.username}
                            </h1>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    {bot.server.host}:{bot.server.port}
                                </span>
                                {bot.note && (
                                    <span className="text-xs bg-muted px-2 py-1 rounded-full">
                                        {bot.note}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium transition-all",
                                isRunning 
                                    ? "bg-green-500/10 border-green-500/20 text-green-600" 
                                    : "bg-red-500/10 border-red-500/20 text-red-600"
                            )}>
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    isRunning ? "bg-green-500 animate-pulse" : "bg-red-500"
                                )} />
                                <span className="uppercase font-bold">
                                    {botStatuses[bot.id] || 'stopped'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <nav className="flex items-center gap-1 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-lg p-1">
                            <NavLink 
                                to="console" 
                                className={({isActive}) => cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Terminal className="h-4 w-4" />
                                Консоль
                            </NavLink>
                            <NavLink 
                                to="plugins" 
                                className={({isActive}) => cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Puzzle className="h-4 w-4" />
                                Плагины
                            </NavLink>
                            <NavLink 
                                to="settings" 
                                className={({isActive}) => cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Settings className="h-4 w-4" />
                                Настройки
                            </NavLink>
                            <NavLink 
                                to="events" 
                                className={({isActive}) => cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Zap className="h-4 w-4" />
                                События
                            </NavLink>
                            <NavLink 
                                to="management" 
                                className={({isActive}) => cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                    isActive 
                                        ? "bg-background text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <Users className="h-4 w-4" />
                                Управление
                            </NavLink>
                        </nav>
                        
                        <div className="flex items-center gap-2">
                            {hasPermission('bot:start_stop') && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => startBot(bot.id)} 
                                        disabled={isRunning}
                                        className="bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                                    >
                                        <Play className="h-4 w-4 mr-1" /> 
                                        Запустить
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => stopBot(bot.id)} 
                                        disabled={!isRunning}
                                        className="bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20 hover:text-red-700"
                                    >
                                        <Square className="h-4 w-4 mr-1" /> 
                                        Остановить
                                    </Button>
                                </>
                            )}
                            {hasPermission('bot:export') && (
                                 <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            title="Экспортировать бота"
                                            className="bg-blue-500/10 border-blue-500/20 text-blue-600 hover:bg-blue-500/20 hover:text-blue-700"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <ExportBotDialog bot={bot} onCancel={() => setIsExportModalOpen(false)} />
                                </Dialog>
                            )}
                            {hasPermission('bot:delete') && (
                                 <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsDeleteConfirmOpen(true)} 
                                    disabled={isRunning} 
                                    title="Удалить бота"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-grow min-h-0 flex flex-col overflow-hidden">
                    <Outlet />
                </main>
            </div>

            <ConfirmationDialog
                open={isDeleteConfirmOpen}
                onOpenChange={setIsDeleteConfirmOpen}
                title={`Удалить бота ${bot.username}?`}
                description="Это действие необратимо. Вся конфигурация, связанная с этим ботом, будет удалена."
                onConfirm={handleDeleteConfirm}
                confirmText="Да, удалить бота"
            />
        </>
    );
}