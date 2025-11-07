import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Bot, 
    Play, 
    Square, 
    Upload, 
    Activity, 
    Zap, 
    Clock, 
    TrendingUp, 
    Server,
    ArrowRight,
    Circle,
    CheckCircle2,
    XCircle,
    Cpu,
    MemoryStick,
    Puzzle,
    Settings,
    AlertCircle,
    Terminal,
    CalendarClock,
    MessageSquarePlus,
    Info,
    FileText
} from 'lucide-react';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import ImportBotDialog from '@/components/ImportBotDialog';
import ResourceUsageWidget from '@/components/ResourceUsageWidget';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { apiHelper } from '@/lib/api';

export default function DashboardPage() {
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const resourceUsage = useAppStore(state => state.resourceUsage);
    const fetchInitialData = useAppStore(state => state.fetchInitialData);
    const startAllBots = useAppStore(state => state.startAllBots);
    const stopAllBots = useAppStore(state => state.stopAllBots);
    const hasPermission = useAppStore(state => state.hasPermission);
    const appVersion = useAppStore(state => state.appVersion);
    const changelog = useAppStore(state => state.changelog);
    const setShowChangelogDialog = useAppStore(state => state.setShowChangelogDialog);
    const fetchChangelog = useAppStore(state => state.fetchChangelog);
    
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [systemHealth, setSystemHealth] = useState({
        panel: true,
        websocket: true,
        database: true,
        uptime: '0ч',
        uptimeSeconds: 0,
        systemCpu: 0,
        systemMemory: 0,
        systemMemoryPercent: 0,
        systemMemoryTotal: 0
    });

    const stats = useMemo(() => {
        const running = bots.filter(bot => botStatuses[bot.id] === 'running').length;
        const totalCpu = Object.values(resourceUsage).reduce((sum, usage) => sum + (usage.cpu || 0), 0);
        const totalMemory = Object.values(resourceUsage).reduce((sum, usage) => sum + (usage.memory || 0), 0);
        const avgCpu = running > 0 ? (totalCpu / running).toFixed(1) : 0;
        const avgMemory = running > 0 ? (totalMemory / running).toFixed(0) : 0;
        
        return {
            totalBots: bots.length,
            runningBots: running,
            stoppedBots: bots.length - running,
            avgCpu,
            avgMemory,
            uptime: systemHealth.uptime,
            totalCpu,
            totalMemory,
            // Системные метрики (из health API)
            systemCpu: systemHealth.systemCpu || 0,
            systemMemory: systemHealth.systemMemory || 0,
            systemMemoryPercent: systemHealth.systemMemoryPercent || 0,
            systemMemoryTotal: systemHealth.systemMemoryTotal || 0
        };
    }, [bots, botStatuses, resourceUsage, systemHealth]);

    // Реальная активность - боты, которые недавно изменили статус
    const recentActivity = useMemo(() => {
        const activities = [];
        
        // Сначала добавляем запущенные боты
        bots.filter(bot => botStatuses[bot.id] === 'running')
            .slice(0, 3)
            .forEach(bot => {
                activities.push({
                    id: bot.id,
                    name: bot.username,
                    status: 'running',
                    server: `${bot.server.host}:${bot.server.port}`,
                    type: 'status'
                });
            });
        
        // Затем остановленные
        bots.filter(bot => botStatuses[bot.id] === 'stopped')
            .slice(0, 2)
            .forEach(bot => {
                activities.push({
                    id: bot.id,
                    name: bot.username,
                    status: 'stopped',
                    server: `${bot.server.host}:${bot.server.port}`,
                    type: 'status'
                });
            });
        
        return activities.slice(0, 5);
    }, [bots, botStatuses]);

    // Проверка здоровья системы
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const data = await apiHelper('/api/system/health');
                setSystemHealth({
                    panel: data.services.panel,
                    websocket: data.services.websocket,
                    database: data.services.database,
                    uptime: data.uptime,
                    uptimeSeconds: data.uptimeSeconds,
                    systemCpu: data.cpu?.usage || 0,
                    systemMemory: data.memory?.used || 0,
                    systemMemoryPercent: data.memory?.usedPercent || 0,
                    systemMemoryTotal: data.memory?.total || 0
                });
            } catch (error) {
                console.error('Failed to fetch system health:', error);
                // Fallback на локальную проверку
                const wsWorking = bots.length > 0;
                setSystemHealth(prev => ({
                    ...prev,
                    panel: true,
                    websocket: wsWorking,
                    database: true
                }));
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Проверяем каждые 30 сек
        
        return () => clearInterval(interval);
    }, [bots]);

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
        <div className="flex flex-col h-full w-full overflow-y-auto">
            {/* Hero Section */}
            <div className="border-b bg-muted/30">
                <div className="p-6 sm:p-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                                Обзор системы
                            </h1>
                            <p className="text-muted-foreground">
                                Мониторинг и управление вашими ботами BlockMineJS
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {hasPermission('bot:import') && (
                                <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Импорт
                                        </Button>
                                    </DialogTrigger>
                                    <ImportBotDialog onImportSuccess={handleImportSuccess} onCancel={() => setIsImportModalOpen(false)} />
                                </Dialog>
                            )}

                            {hasPermission('bot:start_stop') && (
                                <>
                                    <Button onClick={() => handleMassAction('start')} variant="outline" size="sm">
                                        <Play className="mr-2 h-3.5 w-3.5" />
                                        Запустить все
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleMassAction('stop')}>
                                        <Square className="mr-2 h-3.5 w-3.5" />
                                        Остановить все
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                label="Всего ботов"
                                value={stats.totalBots}
                                icon={Bot}
                                trend={stats.totalBots > 0 ? 'neutral' : 'down'}
                            />
                            <MetricCard
                                label="Активных"
                                value={stats.runningBots}
                                icon={Activity}
                                trend={stats.runningBots > 0 ? 'up' : 'down'}
                                accentColor="text-green-500"
                            />
                            <MetricCard
                                label="Системный CPU"
                                value={`${stats.systemCpu.toFixed(1)}%`}
                                icon={Cpu}
                                trend={stats.systemCpu > 80 ? 'up' : 'neutral'}
                                accentColor={stats.systemCpu > 80 ? 'text-red-500' : undefined}
                            />
                            <MetricCard
                                label="Системная RAM"
                                value={`${stats.systemMemoryPercent}%`}
                                icon={MemoryStick}
                                trend={stats.systemMemoryPercent > 80 ? 'up' : 'neutral'}
                                accentColor={stats.systemMemoryPercent > 80 ? 'text-red-500' : undefined}
                            />
                        </div>
                </div>
            </div>

                {/* Main Content */}
                <div className="flex-1 p-6 sm:p-8 min-h-0 overflow-y-auto">
                    <div className="grid gap-6 lg:grid-cols-12 h-full">
                        {/* Left Column - Activity */}
                        <div className="lg:col-span-8 space-y-6 flex flex-col min-h-0">
                        {/* Мониторинг ресурсов ботов */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    <div>
                                        <CardTitle>Мониторинг ресурсов</CardTitle>
                                        <CardDescription>Использование CPU и RAM всеми запущенными ботами</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ResourceUsageWidget bots={bots} resourceUsage={resourceUsage} />
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Быстрые действия</CardTitle>
                                        <CardDescription>Переходы к основным разделам</CardDescription>
                                    </div>
                                    <Zap className="h-5 w-5 text-primary" />
                                </div>
                            </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <QuickActionButton
                                            icon={<CalendarClock className="h-5 w-5" />}
                                            label="Планировщик"
                                            onClick={() => navigate('/tasks')}
                                        />
                                        <QuickActionButton
                                            icon={<Settings className="h-5 w-5" />}
                                            label="Настройки"
                                            onClick={() => hasPermission('panel:user:list') && navigate('/admin')}
                                            disabled={!hasPermission('panel:user:list')}
                                        />
                                        <QuickActionButton
                                            icon={<MessageSquarePlus className="h-5 w-5" />}
                                            label="Предложить"
                                            onClick={() => window.open('https://github.com/sadzxc/BlockMineJS/issues/new', '_blank')}
                                        />
                                        <QuickActionButton
                                            icon={<Info className="h-5 w-5" />}
                                            label={`v${appVersion || '...'}`}
                                            description="Текущая версия"
                                            onClick={async () => {
                                                if (!changelog) await fetchChangelog();
                                                setShowChangelogDialog(true);
                                            }}
                                        />
                                        <QuickActionButton
                                            icon={<FileText className="h-5 w-5" />}
                                            label="Changelog"
                                            onClick={async () => {
                                                if (!changelog) await fetchChangelog();
                                                setShowChangelogDialog(true);
                                            }}
                                        />
                                        <QuickActionButton
                                            icon={<Server className="h-5 w-5" />}
                                            label="Серверы"
                                            onClick={() => navigate('/servers')}
                                        />
                                    </div>
                                </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Stats & System */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* System Health */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Состояние системы
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <SystemStatusItem
                                    label="Панель управления"
                                    status={systemHealth.panel ? "operational" : "error"}
                                />
                                <SystemStatusItem
                                    label="WebSocket сервер"
                                    status={systemHealth.websocket ? "operational" : "error"}
                                />
                                <SystemStatusItem
                                    label="База данных"
                                    status={systemHealth.database ? "operational" : "error"}
                                />
                                <div className="pt-2 border-t">
                                    <SystemStatusItem
                                        label="Uptime"
                                        status="operational"
                                        value={stats.uptime}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                            {/* Resource Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Ресурсы системы</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ResourceBar
                                        label="CPU"
                                        value={stats.systemCpu}
                                        max={100}
                                        unit="%"
                                    />
                                    <ResourceBar
                                        label="RAM"
                                        value={stats.systemMemory}
                                        max={stats.systemMemoryTotal || 1000}
                                        unit="MB"
                                    />
                                    <div className="pt-2 border-t space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Активных ботов</span>
                                            <span className="font-medium">{stats.runningBots}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Всего памяти</span>
                                            <span className="font-medium">{stats.systemMemoryTotal}MB</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                        {/* Bot Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Распределение ботов</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500" />
                                            <span className="text-sm">Запущено</span>
                                        </div>
                                        <span className="text-sm font-medium">{stats.runningBots}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gray-400" />
                                            <span className="text-sm">Остановлено</span>
                                        </div>
                                        <span className="text-sm font-medium">{stats.stoppedBots}</span>
                                    </div>
                                    <div className="pt-2 border-t">
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${stats.totalBots > 0 ? (stats.runningBots / stats.totalBots) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function MetricCard({ label, value, icon: Icon, trend, accentColor }) {
    return (
        <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", accentColor || "text-muted-foreground")} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend === 'up' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
            )}
            {trend === 'down' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
            )}
        </div>
    );
}

function QuickActionButton({ icon, label, description, onClick, disabled, count }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="relative flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
            {count !== undefined && count > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {count}
                </Badge>
            )}
            <div className="text-muted-foreground group-hover:text-primary transition-colors">
                {icon}
            </div>
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-medium text-center">{label}</span>
                {description && (
                    <span className="text-[10px] text-muted-foreground text-center">{description}</span>
                )}
            </div>
        </button>
    );
}

function ActivityItem({ activity, navigate }) {
    const isRunning = activity.status === 'running';
    
    return (
        <div 
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
            onClick={() => navigate(`/bots/${activity.id}`)}
        >
            <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isRunning ? "bg-green-500/10" : "bg-gray-500/10"
            )}>
                {isRunning ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                    <XCircle className="h-4 w-4 text-gray-500" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {activity.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                    {activity.server}
                </p>
            </div>
            <Badge variant={isRunning ? "default" : "secondary"} className="flex-shrink-0">
                {isRunning ? "Активен" : "Остановлен"}
            </Badge>
        </div>
    );
}

function SystemStatusItem({ label, status, value }) {
    const isOperational = status === 'operational';
    
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Circle className={cn(
                    "h-2 w-2 fill-current",
                    isOperational ? "text-green-500" : "text-red-500"
                )} />
                <span className="text-sm">{label}</span>
            </div>
            {value ? (
                <span className="text-sm font-medium">{value}</span>
            ) : (
                <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    isOperational ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                )}>
                    {isOperational ? "OK" : "Error"}
                </span>
            )}
        </div>
    );
}

function ResourceBar({ label, value, max, unit }) {
    const percentage = (value / max) * 100;
    const isHigh = percentage > 80;
    const isMedium = percentage > 50;
    
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}{unit}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                    className={cn(
                        "h-full transition-all duration-500",
                        isHigh ? "bg-red-500" : isMedium ? "bg-yellow-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
}