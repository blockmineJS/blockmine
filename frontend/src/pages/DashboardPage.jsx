import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bot, Play, Square, Upload } from 'lucide-react';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import StatsCard from '@/components/StatsCard';
import BotQuickManageWidget from '@/components/BotQuickManageWidget';
import ResourceUsageWidget from '@/components/ResourceUsageWidget';
import { useToast } from '@/hooks/use-toast';
import ImportBotDialog from '@/components/ImportBotDialog';
import { useAppStore } from '@/stores/appStore';

export default function DashboardPage() {
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const resourceUsage = useAppStore(state => state.resourceUsage);
    const fetchInitialData = useAppStore(state => state.fetchInitialData);
    const startAllBots = useAppStore(state => state.startAllBots);
    const stopAllBots = useAppStore(state => state.stopAllBots);
    const hasPermission = useAppStore(state => state.hasPermission);
    
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const stats = useMemo(() => {
        const running = bots.filter(bot => botStatuses[bot.id] === 'running').length;
        return {
            totalBots: bots.length,
            runningBots: running,
            stoppedBots: bots.length - running,
        };
    }, [bots, botStatuses]);

    const handleMassAction = async (action) => {
        const actionName = action === 'start' ? 'запустить' : 'остановить';
        if (!window.confirm(`Вы уверены, что хотите ${actionName} ВСЕХ ботов?`)) return;
        
        if (action === 'start') {
            await startAllBots();
        } else {
            await stopAllBots();
        }
    };

    const handleImportSuccess = (newBot) => {
        setIsImportModalOpen(false);
        fetchInitialData();
        toast({ title: "Успех!", description: `Бот "${newBot.username}" успешно импортирован.` });
        navigate(`/bots/${newBot.id}`);
    };

    return (
        <div className="flex flex-col h-full w-full p-4 gap-4 overflow-y-auto">
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Дашборд</h1>
                    <p className="text-muted-foreground">Общая сводка по вашей системе.</p>
                </div>
                <div className="flex gap-2">
                    {hasPermission('bot:import') && (
                        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><Upload className="mr-2"/>Импорт</Button>
                            </DialogTrigger>
                            <ImportBotDialog onImportSuccess={handleImportSuccess} onCancel={() => setIsImportModalOpen(false)} />
                        </Dialog>
                    )}

                    {hasPermission('bot:start_stop') && (
                        <>
                            <Button onClick={() => handleMassAction('start')}><Play className="mr-2"/>Запустить всех</Button>
                            <Button variant="destructive" onClick={() => handleMassAction('stop')}><Square className="mr-2"/>Остановить всех</Button>
                        </>
                    )}
                </div>
            </header>
            
            <main className="grid gap-4 lg:grid-cols-3 flex-grow">
                <div className="lg:col-span-1 space-y-4">
                    <StatsCard title="Всего ботов" value={stats.totalBots} icon={Bot} />
                    <StatsCard title="Запущено" value={stats.runningBots} icon={Play} className="hover:border-green-500" />
                    <StatsCard title="Остановлено" value={stats.stoppedBots} icon={Square} className="hover:border-red-500" />
                </div>
                
                <div className="lg:col-span-1 min-h-[400px]">
                     <BotQuickManageWidget bots={bots} botStatuses={botStatuses} />
                </div>

                <div className="lg:col-span-1 min-h-[400px]">
                    <ResourceUsageWidget bots={bots} resourceUsage={resourceUsage} />
                </div>
            </main>
        </div>
    );
}