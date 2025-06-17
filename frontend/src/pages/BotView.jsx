import React, { useState, useMemo } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Play, Square, Settings, Puzzle, Terminal, Trash2, Users, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ExportBotDialog from '@/components/ExportBotDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useAppStore } from '@/stores/appStore';

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
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-b shrink-0 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{bot.username}</h1>
                        <p className="text-sm text-muted-foreground">{bot.server.host}:{bot.server.port}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${isRunning ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                            {botStatuses[bot.id] || 'stopped'}
                        </span>
                        {hasPermission('bot:start_stop') && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => startBot(bot.id)} disabled={isRunning}>
                                    <Play className="h-4 w-4" /> Запустить
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => stopBot(bot.id)} disabled={!isRunning}>
                                    <Square className="h-4 w-4" /> Остановить
                                </Button>
                            </>
                        )}
                        {hasPermission('bot:export') && (
                             <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" title="Экспортировать бота">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <ExportBotDialog bot={bot} onCancel={() => setIsExportModalOpen(false)} />
                            </Dialog>
                        )}
                        {hasPermission('bot:delete') && (
                             <Button variant="ghost" size="icon" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isRunning} title="Удалить бота">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        )}
                    </div>
                </header>
                
                <nav className="flex items-center gap-2 sm:gap-6 px-4 py-2 border-b shrink-0 overflow-x-auto">
                     <NavLink to="console" className={({isActive}) => `flex items-center gap-2 text-sm pb-2 border-b-2 shrink-0 ${isActive ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}><Terminal className="h-4 w-4"/>Консоль</NavLink>
                     <NavLink to="plugins" className={({isActive}) => `flex items-center gap-2 text-sm pb-2 border-b-2 shrink-0 ${isActive ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}><Puzzle className="h-4 w-4"/>Плагины</NavLink>
                     <NavLink to="settings" className={({isActive}) => `flex items-center gap-2 text-sm pb-2 border-b-2 shrink-0 ${isActive ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}><Settings className="h-4 w-4"/>Настройки</NavLink>
                     {hasPermission('management:view') && (
                        <NavLink to="management" className={({isActive}) => `flex items-center gap-2 text-sm pb-2 border-b-2 shrink-0 ${isActive ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}><Users className="h-4 w-4"/>Управление</NavLink>
                     )}
                </nav>

                <main className="flex-grow min-h-0 flex flex-col">
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