import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bot, Play, Square, Upload, LayoutDashboard, Activity, Zap } from 'lucide-react';
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
        <div className="flex flex-col h-full w-full p-6 gap-6 overflow-y-auto">
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 border border-blue-500/10">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                        <LayoutDashboard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Дашборд
                        </h1>
                        <p className="text-muted-foreground mt-1">Общая сводка по вашей системе BlockMineJS</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {hasPermission('bot:import') && (
                        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-blue-500/20 hover:bg-blue-500/5 hover:border-blue-500/40">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Импорт бота
                                </Button>
                            </DialogTrigger>
                            <ImportBotDialog onImportSuccess={handleImportSuccess} onCancel={() => setIsImportModalOpen(false)} />
                        </Dialog>
                    )}

                    {hasPermission('bot:start_stop') && (
                        <>
                            <Button 
                                onClick={() => handleMassAction('start')} 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                Запустить всех
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={() => handleMassAction('stop')}
                                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                                <Square className="mr-2 h-4 w-4" />
                                Остановить всех
                            </Button>
                        </>
                    )}
                </div>
            </header>
            
            <main className="grid gap-6 lg:grid-cols-3 flex-grow">
                <div className="lg:col-span-1 space-y-4">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/10">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Статистика системы
                        </h2>
                        <div className="space-y-3">
                            <StatsCard 
                                title="Всего ботов" 
                                value={stats.totalBots} 
                                icon={Bot} 
                                className="border-blue-500/20 hover:border-blue-500/40 bg-gradient-to-r from-blue-500/5 to-blue-500/10"
                            />
                            <StatsCard 
                                title="Запущено" 
                                value={stats.runningBots} 
                                icon={Play} 
                                className="border-green-500/20 hover:border-green-500/40 bg-gradient-to-r from-green-500/5 to-green-500/10"
                            />
                            <StatsCard 
                                title="Остановлено" 
                                value={stats.stoppedBots} 
                                icon={Square} 
                                className="border-red-500/20 hover:border-red-500/40 bg-gradient-to-r from-red-500/5 to-red-500/10"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-1 min-h-[500px]">
                    <div className="h-full p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-purple-500" />
                            Быстрое управление
                        </h2>
                        <BotQuickManageWidget bots={bots} botStatuses={botStatuses} />
                    </div>
                </div>

                <div className="lg:col-span-1 min-h-[500px]">
                    <div className="h-full p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/10">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            Мониторинг ресурсов
                        </h2>
                        <ResourceUsageWidget bots={bots} resourceUsage={resourceUsage} />
                    </div>
                </div>
            </main>
        </div>
    );
}