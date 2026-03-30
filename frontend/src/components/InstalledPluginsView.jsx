import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Trash2, Loader2, ArrowUpCircle, Power, PowerOff, Sparkles, Code, Copy, LayoutGrid, List, Package, Activity, GitBranch, CheckCircle2, AlertCircle, Clock, Gauge, Terminal, RefreshCw } from 'lucide-react';
import PluginSettingsDialog from '@/components/PluginSettingsDialog';
import { Dialog } from "@/components/ui/dialog";
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FixedSizeList, FixedSizeGrid } from 'react-window';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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

const formatPluginSourceRef = (plugin) => {
    if (!plugin?.sourceRef) return null;
    if (plugin.sourceRefType === 'tag') return `tag:${plugin.sourceRef}`;
    if (plugin.sourceRefType === 'branch') return `branch:${plugin.sourceRef}`;
    return plugin.sourceRef;
};

const getInstalledMetaBadges = (plugin) => {
    const badges = [
        { key: 'version', label: `v${plugin.version}`, variant: 'outline' },
        {
            key: 'source',
            label: plugin.sourceType,
            variant: plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE' ? 'secondary' : 'outline',
            icon: plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE' ? Code : GitBranch,
        },
    ];

    const sourceRef = formatPluginSourceRef(plugin);
    if (sourceRef) {
        badges.push({ key: 'source-ref', label: sourceRef, variant: 'outline' });
    }

    for (const category of plugin.manifest?.categories || []) {
        badges.push({ key: `category-${category}`, label: category, variant: 'secondary' });
    }

    return badges;
};

function InstalledPluginCard({ plugin, botId, updateInfo, onToggle, onDelete, onUpdate, onOpenSettings, onFork, onReload, viewMode = 'grid' }) {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const hasSettings = plugin.manifest?.settings && Object.keys(plugin.manifest.settings).length > 0;
    
    const isUpdatingThisPlugin = onUpdate && onUpdate.isUpdating === plugin.id;
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

    const metaBadges = useMemo(() => getInstalledMetaBadges(plugin), [plugin]);
    const visibleMetaBadges = metaBadges.slice(0, 4);
    const hiddenMetaBadgeCount = Math.max(0, metaBadges.length - visibleMetaBadges.length);

    const actionButtons = useMemo(() => {
        const actions = [];

        if (isEditable && onFork) {
            actions.push({
                key: 'edit',
                icon: Code,
                tooltip: 'Редактировать код',
                onClick: () => navigate(`/bots/${botId}/plugins/edit/${plugin.name}`),
            });
        }

        if (isEditable && onReload) {
            actions.push({
                key: 'reload',
                icon: RefreshCw,
                tooltip: 'Перезагрузить',
                onClick: () => onReload(plugin),
            });
        }

        if (isForkable && onFork) {
            actions.push({
                key: 'fork',
                icon: Copy,
                tooltip: 'Сделать локальным',
                onClick: () => onFork(plugin),
            });
        }

        if (hasSettings && onOpenSettings) {
            actions.push({
                key: 'settings',
                icon: Settings,
                tooltip: 'Настройки',
                onClick: () => onOpenSettings(plugin),
            });
        }

        if (onDelete) {
            actions.push({
                key: 'delete',
                icon: Trash2,
                tooltip: 'Удалить',
                onClick: () => onDelete(plugin),
                disabled: plugin.isEnabled,
                destructive: true,
            });
        }

        return actions;
    }, [botId, hasSettings, isEditable, isForkable, navigate, onDelete, onFork, onOpenSettings, onReload, plugin]);

    if (viewMode === 'list') {
        return (
            <div 
                className={cn(
                    "relative flex items-start gap-4 p-4 border rounded-lg transition-all duration-300 h-full",
                    "hover:border-primary/50 hover:bg-muted/50",
                    plugin.isEnabled ? "border-green-600/30 bg-green-950/5" : "opacity-80"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {plugin.isEnabled && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-lg" />
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    to={`/bots/${botId}/plugins/view/${plugin.name}`}
                                    className="font-semibold text-lg truncate hover:text-primary transition-colors cursor-pointer"
                                >
                                    {plugin.displayName || plugin.name}
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs">
                                    <div className="text-muted-foreground">ID плагина:</div>
                                    <div className="font-mono">{plugin.name}</div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                        {isNew && (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Новое
                            </Badge>
                        )}
                        {updateInfo && (
                            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-xs">
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
                                Обновление
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        от <span className="font-medium text-primary/90">{plugin.author || 'Неизвестный автор'}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{plugin.description || 'Нет описания.'}</p>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="h-5 px-2 text-xs">v{plugin.version}</Badge>
                        <Badge variant={plugin.sourceType === 'LOCAL' ? 'secondary' : 'outline'} className="h-5 px-2 text-xs">
                            {plugin.sourceType === 'LOCAL' ? <Code className="h-3 w-3 mr-1" /> : <GitBranch className="h-3 w-3 mr-1" />}
                            {plugin.sourceType}
                        </Badge>
                        {formatPluginSourceRef(plugin) && (
                            <Badge variant="outline" className="h-5 px-2 text-xs">
                                {formatPluginSourceRef(plugin)}
                            </Badge>
                        )}
                        {plugin.manifest?.categories?.slice(0, 2).map(category => (
                            <Badge key={category} variant="secondary" className="h-5 px-2 text-xs">
                                {category}
                            </Badge>
                        ))}
                        {updateInfo && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        className="h-5 cursor-pointer border-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-2 text-xs text-white whitespace-nowrap"
                                        onClick={() => onUpdate?.handle(plugin.id)}
                                    >
                                        {isUpdatingThisPlugin ? (
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : (
                                            <ArrowUpCircle className="mr-1 h-3 w-3" />
                                        )}
                                        v{updateInfo.recommendedVersion}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isUpdatingThisPlugin ? 'Обновление...' : `Обновить до ${updateInfo.recommendedVersion}`}
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {lastUpdated && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lastUpdated}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                    <div className="flex gap-1">
                        {isEditable && onFork && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/bots/${botId}/plugins/edit/${plugin.name}`)}>
                                        <Code className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Редактировать код</TooltipContent>
                            </Tooltip>
                        )}
                        {isEditable && onReload && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onReload(plugin)}>
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Перезагрузить из package.json</TooltipContent>
                            </Tooltip>
                        )}
                        {isForkable && onFork && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onFork(plugin)}>
                                        <Code className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Сделать локальным</TooltipContent>
                            </Tooltip>
                        )}
                        {hasSettings && onOpenSettings && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenSettings(plugin)}>
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Настройки</TooltipContent>
                            </Tooltip>
                        )}
                        {onDelete && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(plugin)} disabled={plugin.isEnabled}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Удалить</TooltipContent>
                        </Tooltip>
                        )}
                    </div>
                    <Switch
                        checked={plugin.isEnabled}
                        onCheckedChange={onToggle ? ((checked) => onToggle(plugin, checked)) : undefined}
                        disabled={!onToggle}
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
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
            )}
            
            {(isNew || updateInfo) && (
                <div className="absolute left-0 top-0 z-10 flex flex-col items-start gap-1">
                    {isNew && (
                        <Badge className="rounded-none rounded-br-md border-0 bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-0.5 text-[10px] text-white shadow-sm">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Новое
                        </Badge>
                    )}
                    {updateInfo && (
                        <Badge className="rounded-none rounded-br-md border-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-0.5 text-[10px] text-white shadow-sm">
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                            Обновление
                        </Badge>
                    )}
                </div>
            )}
            
            <CardHeader className="pb-2 pt-5">
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
                        </div>
                        <div className="min-w-0 flex-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        to={`/bots/${botId}/plugins/view/${plugin.name}`}
                                        className="block"
                                    >
                                        <CardTitle className="line-clamp-2 text-lg leading-tight hover:text-primary transition-colors cursor-pointer">
                                            {plugin.displayName || plugin.name}
                                        </CardTitle>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-xs">
                                        <div className="text-muted-foreground">ID плагина:</div>
                                        <div className="font-mono">{plugin.name}</div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <CardDescription className="text-sm truncate">
                                от {plugin.author || 'Неизвестный автор'}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        {updateInfo && onUpdate && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 mr-1"
                                        onClick={() => onUpdate.handle(plugin.id)}
                                        disabled={isUpdatingThisPlugin}
                                    >
                                        {isUpdatingThisPlugin ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ArrowUpCircle className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isUpdatingThisPlugin ? 'Обновление...' : `Обновить до ${updateInfo.recommendedVersion}`}
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Switch
                            checked={plugin.isEnabled}
                            onCheckedChange={onToggle ? ((checked) => onToggle(plugin, checked)) : undefined}
                            disabled={!onToggle}
                            className="shrink-0"
                        />
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-3 pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {plugin.description || 'Нет описания.'}
                </p>
                
                <div className="flex flex-wrap gap-1">
                    {visibleMetaBadges.map(({ key, label, variant, icon: Icon }) => (
                        <Badge key={key} variant={variant} className="max-w-full text-xs">
                            {Icon ? <Icon className="mr-1 h-3 w-3" /> : null}
                            <span className="truncate">{label}</span>
                        </Badge>
                    ))}
                    {hiddenMetaBadgeCount > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className="cursor-help text-xs hover:bg-muted">
                                    +{hiddenMetaBadgeCount}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <div className="flex flex-wrap gap-1">
                                    {metaBadges.slice(visibleMetaBadges.length).map(({ key, label }) => (
                                        <Badge key={key} variant="secondary" className="text-xs">
                                            {label}
                                        </Badge>
                                    ))}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )}
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
                                    {plugin.commands.slice(0, 2).map(cmd => (
                                        <Badge key={cmd.id} variant="outline" className="text-xs">
                                            {cmd.name}
                                        </Badge>
                                    ))}
                                    {plugin.commands.length > 2 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                                                    +{plugin.commands.length - 2}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <div className="flex flex-wrap gap-1">
                                                    {plugin.commands.slice(2).map(cmd => (
                                                        <Badge key={cmd.id} variant="secondary" className="text-xs">
                                                            {cmd.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
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
                                    {plugin.eventGraphs.slice(0, 2).map(graph => (
                                        <Badge key={graph.id} variant="outline" className="text-xs">
                                            {graph.name}
                                        </Badge>
                                    ))}
                                    {plugin.eventGraphs.length > 2 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                                                    +{plugin.eventGraphs.length - 2}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <div className="flex flex-wrap gap-1">
                                                    {plugin.eventGraphs.slice(2).map(graph => (
                                                        <Badge key={graph.id} variant="secondary" className="text-xs">
                                                            {graph.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
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
            
            <CardFooter className="mt-auto border-t pt-2">
                {updateInfo && onUpdate && (
                    <Button 
                        className="h-9 w-full justify-center text-sm"
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
                
                <div className="flex w-full items-center gap-2">
                    {isEditable && onFork && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 min-w-0 flex-1" onClick={() => navigate(`/bots/${botId}/plugins/edit/${plugin.name}`)}>
                                    <Code className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Редактировать код</TooltipContent>
                        </Tooltip>
                    )}
                    {isEditable && onReload && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 min-w-0 flex-1" onClick={() => onReload(plugin)}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Перезагрузить</TooltipContent>
                        </Tooltip>
                    )}
                    {isForkable && onFork && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 min-w-0 flex-1" onClick={() => onFork(plugin)}>
                                    <Code className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Сделать локальным</TooltipContent>
                        </Tooltip>
                    )}
                    {hasSettings && onOpenSettings && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 min-w-0 flex-1" onClick={() => onOpenSettings(plugin)}>
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Настройки</TooltipContent>
                        </Tooltip>
                    )}
                    {onDelete && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 min-w-0 flex-1" onClick={() => onDelete(plugin)} disabled={plugin.isEnabled}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Удалить</TooltipContent>
                    </Tooltip>
                    )}
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
    onForkPlugin,
    onReloadPlugin
}) {
    const [selectedPlugin, setSelectedPlugin] = useState(null);
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('installed-plugins-view-mode');
        return saved || 'grid';
    });
    const [pluginToDelete, setPluginToDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

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
        const byFilter = (() => {
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
        })();
        if (!searchQuery) return byFilter;
        const q = searchQuery.toLowerCase();
        return byFilter.filter(p => (
            (p.displayName || p.name)?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.author?.toLowerCase().includes(q)
        ));
    }, [installedPlugins, filter, updates, searchQuery]);

    const isXl = useMediaQuery("(min-width: 1280px)");
    const isLg = useMediaQuery("(min-width: 1024px)");
    const isMd = useMediaQuery("(min-width: 768px)");

    const columnCount = useMemo(() => (isXl ? 4 : isLg ? 3 : isMd ? 2 : 1), [isXl, isLg, isMd]);
    const rowCount = Math.ceil(sortedAndFilteredPlugins.length / columnCount);
    const columnWidth = size.width > 0 ? size.width / columnCount : 0;
    const rowHeight = 388; 

    useEffect(() => {
        localStorage.setItem('installed-plugins-view-mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                setSize({
                    width: container.offsetWidth,
                    height: container.offsetHeight,
                });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    const Row = ({ index, style }) => {
        const plugin = sortedAndFilteredPlugins[index];
        return (
            <div style={style} className="py-1.5 px-4">
                <InstalledPluginCard
                    plugin={plugin}
                    botId={bot.id}
                    updateInfo={updates[plugin.sourceUri]}
                    onToggle={onTogglePlugin}
                    onDelete={() => setPluginToDelete(plugin)}
                    onUpdate={{ handle: onUpdatePlugin, isUpdating: isUpdating }}
                    onOpenSettings={setSelectedPlugin}
                    onFork={onForkPlugin}
                    onReload={onReloadPlugin}
                    viewMode="list"
                />
            </div>
        );
    };

    const Cell = ({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * columnCount + columnIndex;
        if (index >= sortedAndFilteredPlugins.length) {
            return null;
        }
        const plugin = sortedAndFilteredPlugins[index];
        return (
            <div style={style} className="p-3">
                <InstalledPluginCard
                    plugin={plugin}
                    botId={bot.id}
                    updateInfo={updates[plugin.sourceUri]}
                    onToggle={onTogglePlugin}
                    onDelete={() => setPluginToDelete(plugin)}
                    onUpdate={{ handle: onUpdatePlugin, isUpdating: isUpdating }}
                    onOpenSettings={setSelectedPlugin}
                    onFork={onForkPlugin}
                    onReload={onReloadPlugin}
                    viewMode="grid"
                />
            </div>
        );
    };

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-background/30">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                            size="sm" 
                            onClick={() => setFilter('all')}
                            variant={filter === 'all' ? "default" : "ghost"}
                        >
                            Все ({stats.total})
                        </Button>
                        <div className="h-4 w-px bg-border" />
                        <Button 
                            size="sm" 
                            onClick={() => setFilter('enabled')}
                            variant={filter === 'enabled' ? "default" : "ghost"}
                        >
                            <Power className="mr-1.5 h-3.5 w-3.5"/>
                            Активно ({stats.enabled})
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => setFilter('disabled')}
                            variant={filter === 'disabled' ? "default" : "ghost"}
                        >
                            <PowerOff className="mr-1.5 h-3.5 w-3.5"/>
                            Выкл ({stats.disabled})
                        </Button>
                        {stats.updates > 0 && (
                            <>
                                <div className="h-4 w-px bg-border" />
                                <Button 
                                    variant={filter === 'updates' ? 'default' : 'ghost'} 
                                    size="sm" 
                                    onClick={() => setFilter('updates')} 
                                    className={cn(stats.updates > 0 && filter !== 'updates' && "text-blue-500")}
                                >
                                    <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5"/>
                                    Обновления ({stats.updates})
                                </Button>
                            </>
                        )}
                        <div className="h-4 w-px bg-border" />
                        <Button 
                            size="sm" 
                            onClick={() => setFilter('local')}
                            variant={filter === 'local' ? "default" : "ghost"}
                        >
                            <Code className="mr-1.5 h-3.5 w-3.5"/>
                            Локальные ({stats.local})
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => setFilter('github')}
                            variant={filter === 'github' ? "default" : "ghost"}
                        >
                            <GitBranch className="mr-1.5 h-3.5 w-3.5"/>
                            GitHub ({stats.github})
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative w-48">
                            <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Поиск..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-sm"
                            />
                        </div>
                        <Tabs value={viewMode} onValueChange={setViewMode}>
                            <TabsList className="h-8">
                                <TabsTrigger value="grid" className="h-7 px-2">
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </TabsTrigger>
                                <TabsTrigger value="list" className="h-7 px-2">
                                    <List className="h-3.5 w-3.5" />
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden" ref={containerRef}>
                    {sortedAndFilteredPlugins.length > 0 && size.width > 0 ? (
                        viewMode === 'grid' ? (
                            <FixedSizeGrid
                                height={size.height}
                                width={size.width}
                                columnCount={columnCount}
                                columnWidth={columnWidth}
                                rowCount={rowCount}
                                rowHeight={rowHeight}
                                overscanRowCount={1}
                                overscanColumnCount={1}
                            >
                                {Cell}
                            </FixedSizeGrid>
                        ) : (
                            <FixedSizeList
                                height={size.height}
                                width={size.width}
                                itemCount={sortedAndFilteredPlugins.length}
                            itemSize={150}
                                overscanCount={5}
                            >
                                {Row}
                            </FixedSizeList>
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
                {selectedPlugin && <PluginSettingsDialog bot={bot} plugin={selectedPlugin} onOpenChange={(isOpen) => !isOpen && setSelectedPlugin(null)} onSaveSuccess={onSaveSettings} readOnly={!onUpdatePlugin} />}
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
