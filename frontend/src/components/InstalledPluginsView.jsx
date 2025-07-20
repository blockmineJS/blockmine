import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Trash2, Loader2, ArrowUpCircle, Power, PowerOff, Sparkles, Code, Copy, LayoutGrid, List, Package, Activity, GitBranch, CheckCircle2, AlertCircle, Clock, Gauge, Terminal } from 'lucide-react';
import PluginSettingsDialog from '@/components/PluginSettingsDialog';
import { Dialog } from "@/components/ui/dialog";
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

const cardStyles = {
    card: "relative overflow-hidden transition-all duration-300 group h-full flex flex-col",
    header: "pb-3",
    content: "flex-1 space-y-3 pb-3",
    footer: "pt-3 border-t space-y-3"
};

const IconComponent = ({ name, ...props }) => {
    if (!name) return <Package {...props} />;
    if (name.startsWith('/') || name.startsWith('http')) return <img src={name} alt="plugin icon" {...props} />;
    const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const LucideIcon = Icons[iconName] || Package;
    return <LucideIcon {...props} />;
};

function InstalledPluginCard({ plugin, botId, updateInfo, onToggle, onDelete, onUpdate, onOpenSettings, onFork, viewMode = 'grid' }) {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const hasSettings = plugin.manifest?.settings && Object.keys(plugin.manifest.settings).length > 0;
    
    const isUpdatingThisPlugin = onUpdate.isUpdating === plugin.id;
    const isEditable = plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE';
    const isForkable = plugin.sourceType === 'GITHUB';

    const isNew = useMemo(() => {
        if (!plugin.createdAt) return false;
        const installDate = new Date(plugin.createdAt);
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        return (now - installDate) < oneDay;
    }, [plugin.createdAt]);

    const lastUpdated = useMemo(() => {
        if (!plugin.updatedAt) return null;
        const date = new Date(plugin.updatedAt);
        const days = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Сегодня';
        if (days === 1) return 'Вчера';
        if (days < 7) return `${days} дней назад`;
        if (days < 30) return `${Math.floor(days / 7)} недель назад`;
        return `${Math.floor(days / 30)} месяцев назад`;
    }, [plugin.updatedAt]);

    if (viewMode === 'list') {
        return (
            <div 
                className={cn(
                    "relative flex items-start gap-4 p-4 border rounded-lg transition-all duration-300",
                    "hover:border-primary/50 hover:bg-muted/50",
                    plugin.isEnabled ? "border-green-600/30 bg-green-950/5" : "opacity-80"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {plugin.isEnabled && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-green-600 rounded-l-lg" />
                )}
                
                <div className="relative shrink-0 mt-1">
                    <IconComponent 
                        name={plugin.manifest?.icon} 
                        className={cn(
                            "h-10 w-10",
                            plugin.isEnabled ? "text-primary" : "text-muted-foreground"
                        )} 
                    />
                    {isNew && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                </div>

                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{plugin.name}</h3>
                        {isNew && (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Новое
                            </Badge>
                        )}
                        {updateInfo && (
                            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-xs animate-pulse">
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
                                Обновление
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        от <span className="font-medium text-primary/90">{plugin.author || 'Неизвестный автор'}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{plugin.description || 'Нет описания.'}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">v{plugin.version}</Badge>
                        <Badge variant={plugin.sourceType === 'LOCAL' ? 'secondary' : 'outline'} className="text-xs">
                            {plugin.sourceType === 'LOCAL' ? <Code className="h-3 w-3 mr-1" /> : <GitBranch className="h-3 w-3 mr-1" />}
                            {plugin.sourceType}
                        </Badge>
                        {plugin.manifest?.categories?.slice(0, 2).map(category => (
                            <Badge key={category} variant="secondary" className="text-xs">
                                {category}
                            </Badge>
                        ))}
                        {lastUpdated && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lastUpdated}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                    {updateInfo && (
                        <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                            onClick={() => onUpdate.handle(plugin.id)} 
                            disabled={isUpdatingThisPlugin}
                        >
                            {isUpdatingThisPlugin ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <ArrowUpCircle className="h-4 w-4 mr-1" />
                                    v{updateInfo.recommendedVersion}
                                </>
                            )}
                        </Button>
                    )}
                    <div className="flex gap-1">
                        {isEditable && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/bots/${botId}/plugins/edit/${plugin.name}`)}>
                                        <Code className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Редактировать код</TooltipContent>
                            </Tooltip>
                        )}
                        {isForkable && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFork(plugin)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Создать локальную копию</TooltipContent>
                            </Tooltip>
                        )}
                        {hasSettings && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!plugin.isEnabled} onClick={() => onOpenSettings(plugin)}>
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Настройки</TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(plugin)} disabled={plugin.isEnabled}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Удалить</TooltipContent>
                        </Tooltip>
                    </div>
                    <Switch
                        checked={plugin.isEnabled}
                        onCheckedChange={(checked) => onToggle(plugin, checked)}
                        className="ml-2"
                    />
                </div>
            </div>
        );
    }

    return (
        <Card 
            className={cn(
                cardStyles.card,
                "hover:border-primary/50 hover:shadow-lg",
                plugin.isEnabled ? "border-green-600/30 bg-green-950/5" : "opacity-80"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {plugin.isEnabled && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600" />
            )}
            
            {(isNew || updateInfo) && (
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    {isNew && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Новое
                        </Badge>
                    )}
                    {updateInfo && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-xs animate-pulse">
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                            Обновление
                        </Badge>
                    )}
                </div>
            )}
            
            <CardHeader className={cardStyles.header}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                            <IconComponent 
                                name={plugin.manifest?.icon} 
                                className={cn(
                                    "h-10 w-10 transition-all duration-300",
                                    plugin.isEnabled ? "text-primary" : "text-muted-foreground",
                                    isHovered && "scale-110"
                                )} 
                            />
                            {isNew && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">
                                {plugin.name}
                            </CardTitle>
                            <CardDescription className="text-sm truncate">
                                от {plugin.author || 'Неизвестный автор'}
                            </CardDescription>
                        </div>
                    </div>
                    <Switch
                        checked={plugin.isEnabled}
                        onCheckedChange={(checked) => onToggle(plugin, checked)}
                        className="shrink-0"
                    />
                </div>
            </CardHeader>
            
            <CardContent className={cardStyles.content}>
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {plugin.description || 'Нет описания.'}
                </p>
                
                <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">v{plugin.version}</Badge>
                    <Badge variant={plugin.sourceType === 'LOCAL' ? 'secondary' : 'outline'} className="text-xs">
                        {plugin.sourceType === 'LOCAL' ? <Code className="h-3 w-3 mr-1" /> : <GitBranch className="h-3 w-3 mr-1" />}
                        {plugin.sourceType}
                    </Badge>
                    {plugin.manifest?.categories?.slice(0, 1).map(category => (
                        <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                        </Badge>
                    ))}
                </div>
                
                {(plugin.commands?.length > 0 || plugin.eventGraphs?.length > 0) && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                        {plugin.commands?.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Terminal className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-muted-foreground">
                                    Команды: {plugin.commands.length}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {plugin.commands.slice(0, 3).map(cmd => (
                                        <Badge key={cmd.id} variant="outline" className="text-xs">
                                            {cmd.name}
                                        </Badge>
                                    ))}
                                    {plugin.commands.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{plugin.commands.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {plugin.eventGraphs?.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-muted-foreground">
                                    Графы событий: {plugin.eventGraphs.length}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {plugin.eventGraphs.slice(0, 3).map(graph => (
                                        <Badge key={graph.id} variant="outline" className="text-xs">
                                            {graph.name}
                                        </Badge>
                                    ))}
                                    {plugin.eventGraphs.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{plugin.eventGraphs.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {lastUpdated && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lastUpdated}
                    </div>
                )}
            </CardContent>
            
            <CardFooter className={cardStyles.footer}>
                {updateInfo && (
                    <Button 
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                        size="sm"
                        onClick={() => onUpdate.handle(plugin.id)} 
                        disabled={isUpdatingThisPlugin}
                    >
                        {isUpdatingThisPlugin ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Обновление...
                            </>
                        ) : (
                            <>
                                <ArrowUpCircle className="mr-2 h-4 w-4" />
                                Обновить до v{updateInfo.recommendedVersion}
                            </>
                        )}
                    </Button>
                )}
                
                <div className="grid grid-cols-2 gap-2 w-full">
                    {isEditable && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => navigate(`/bots/${botId}/plugins/edit/${plugin.name}`)}>
                                    <Code className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Редактировать код</TooltipContent>
                        </Tooltip>
                    )}
                    {isForkable && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => onFork(plugin)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Создать копию</TooltipContent>
                        </Tooltip>
                    )}
                    {hasSettings && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" disabled={!plugin.isEnabled} onClick={() => onOpenSettings(plugin)}>
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Настройки</TooltipContent>
                        </Tooltip>
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => onDelete(plugin)} disabled={plugin.isEnabled}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Удалить</TooltipContent>
                    </Tooltip>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function InstalledPluginsView({ 
    bot, 
    installedPlugins = [],
    updates = {}, 
    isUpdating, 
    onTogglePlugin, 
    onDeletePlugin, 
    onUpdatePlugin, 
    onSaveSettings,
    onForkPlugin
}) {
    const [selectedPlugin, setSelectedPlugin] = useState(null);
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('installed-plugins-view-mode');
        return saved || 'grid';
    });
    const [pluginToDelete, setPluginToDelete] = useState(null);

    const stats = useMemo(() => {
        const enabled = installedPlugins.filter(p => p.isEnabled).length;
        const local = installedPlugins.filter(p => p.sourceType === 'LOCAL' || p.sourceType === 'LOCAL_IDE').length;
        const github = installedPlugins.filter(p => p.sourceType === 'GITHUB').length;
        
        const totalCommands = installedPlugins.reduce((sum, p) => sum + (p.commands?.length || 0), 0);
        const totalGraphs = installedPlugins.reduce((sum, p) => sum + (p.eventGraphs?.length || 0), 0);
        
        return {
            total: installedPlugins.length,
            enabled: enabled,
            disabled: installedPlugins.length - enabled,
            updates: Object.keys(updates).length,
            local,
            github,
            commands: totalCommands,
            graphs: totalGraphs
        };
    }, [installedPlugins, updates]);

    const sortedAndFilteredPlugins = useMemo(() => {
        const sorted = [...installedPlugins].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        switch (filter) {
            case 'enabled':
                return sorted.filter(p => p.isEnabled);
            case 'disabled':
                return sorted.filter(p => !p.isEnabled);
            case 'updates':
                return sorted.filter(p => updates[p.sourceUri]);
            case 'local':
                return sorted.filter(p => p.sourceType === 'LOCAL' || p.sourceType === 'LOCAL_IDE');
            case 'github':
                return sorted.filter(p => p.sourceType === 'GITHUB');
            default:
                return sorted;
        }
    }, [installedPlugins, filter, updates]);

    useEffect(() => {
        localStorage.setItem('installed-plugins-view-mode', viewMode);
    }, [viewMode]);

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex flex-col h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-muted/30 border-b">
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Всего</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Power className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold text-green-500">{stats.enabled}</p>
                                <p className="text-xs text-muted-foreground">Активно</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <PowerOff className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-2xl font-bold">{stats.disabled}</p>
                                <p className="text-xs text-muted-foreground">Выключено</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <ArrowUpCircle className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold text-blue-500">{stats.updates}</p>
                                <p className="text-xs text-muted-foreground">Обновлений</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Code className="h-5 w-5 text-purple-500" />
                            <div>
                                <p className="text-2xl font-bold text-purple-500">{stats.local}</p>
                                <p className="text-xs text-muted-foreground">Локальные</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <GitBranch className="h-5 w-5 text-orange-500" />
                            <div>
                                <p className="text-2xl font-bold text-orange-500">{stats.github}</p>
                                <p className="text-xs text-muted-foreground">GitHub</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Terminal className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold text-blue-500">{stats.commands}</p>
                                <p className="text-xs text-muted-foreground">Команды</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Activity className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold text-green-500">{stats.graphs}</p>
                                <p className="text-xs text-muted-foreground">Графы</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant={filter === 'all' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setFilter('all')}
                            className={cn(filter === 'all' && "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:text-white")}
                        >
                            Все ({stats.total})
                        </Button>
                        <Button 
                            variant={filter === 'enabled' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setFilter('enabled')}
                            className={cn(filter === 'enabled' && "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:text-white")}
                        >
                            <Power className="mr-1 h-4 w-4"/>
                            Включенные ({stats.enabled})
                        </Button>
                        <Button 
                            variant={filter === 'disabled' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setFilter('disabled')}
                        >
                            <PowerOff className="mr-1 h-4 w-4"/>
                            Выключенные ({stats.disabled})
                        </Button>
                        {stats.updates > 0 && (
                            <Button 
                                variant={filter === 'updates' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                onClick={() => setFilter('updates')} 
                                className={cn(
                                    "animate-pulse",
                                    filter === 'updates' && "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:text-white"
                                )}
                            >
                                <ArrowUpCircle className="mr-1 h-4 w-4"/>
                                Обновления ({stats.updates})
                            </Button>
                        )}
                        <Button 
                            variant={filter === 'local' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setFilter('local')}
                            className={cn(filter === 'local' && "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:text-white")}
                        >
                            <Code className="mr-1 h-4 w-4"/>
                            Локальные ({stats.local})
                        </Button>
                        <Button 
                            variant={filter === 'github' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setFilter('github')}
                            className={cn(filter === 'github' && "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:text-white")}
                        >
                            <GitBranch className="mr-1 h-4 w-4"/>
                            GitHub ({stats.github})
                        </Button>
                    </div>
                    
                    <Tabs value={viewMode} onValueChange={setViewMode}>
                        <TabsList>
                            <TabsTrigger value="grid" className="flex items-center gap-2">
                                <LayoutGrid className="h-4 w-4" />
                                Сетка
                            </TabsTrigger>
                            <TabsTrigger value="list" className="flex items-center gap-2">
                                <List className="h-4 w-4" />
                                Список
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {sortedAndFilteredPlugins.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {sortedAndFilteredPlugins.map((plugin, index) => (
                                    <div
                                        key={plugin.id}
                                        className="animate-in slide-in-from-bottom duration-300"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <InstalledPluginCard
                                            plugin={plugin}
                                            botId={bot.id}
                                            updateInfo={updates[plugin.sourceUri]}
                                            onToggle={onTogglePlugin}
                                            onDelete={() => setPluginToDelete(plugin)}
                                            onUpdate={{ handle: onUpdatePlugin, isUpdating: isUpdating }}
                                            onOpenSettings={setSelectedPlugin}
                                            onFork={onForkPlugin}
                                            viewMode={viewMode}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedAndFilteredPlugins.map((plugin) => (
                                    <InstalledPluginCard
                                        key={plugin.id}
                                        plugin={plugin}
                                        botId={bot.id}
                                        updateInfo={updates[plugin.sourceUri]}
                                        onToggle={onTogglePlugin}
                                        onDelete={() => setPluginToDelete(plugin)}
                                        onUpdate={{ handle: onUpdatePlugin, isUpdating: isUpdating }}
                                        onOpenSettings={setSelectedPlugin}
                                        onFork={onForkPlugin}
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-10">
                            <Package className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold text-muted-foreground">Нет плагинов</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                {filter === 'all' 
                                    ? 'У вас пока нет установленных плагинов'
                                    : 'Нет плагинов, соответствующих выбранному фильтру'}
                            </p>
                            {filter !== 'all' && (
                                <Button 
                                    variant="outline" 
                                    className="mt-4"
                                    onClick={() => setFilter('all')}
                                >
                                    Показать все плагины
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <Dialog open={!!selectedPlugin} onOpenChange={(isOpen) => !isOpen && setSelectedPlugin(null)}>
                {selectedPlugin && <PluginSettingsDialog bot={bot} plugin={selectedPlugin} onOpenChange={(isOpen) => !isOpen && setSelectedPlugin(null)} onSaveSuccess={onSaveSettings} />}
            </Dialog>

            {pluginToDelete && (
                <ConfirmationDialog
                    open={!!pluginToDelete}
                    onOpenChange={() => setPluginToDelete(null)}
                    title={`Удалить плагин "${pluginToDelete.name}"?`}
                    description="Это действие необратимо. Все файлы и настройки плагина будут удалены для этого бота."
                    onConfirm={() => onDeletePlugin(pluginToDelete)}
                    confirmText="Да, удалить плагин"
                />
            )}
        </TooltipProvider>
    );
}