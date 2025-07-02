import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Trash2, Loader2, ArrowUpCircle, Power, PowerOff, Sparkles, Code, Copy } from 'lucide-react';
import PluginSettingsDialog from '@/components/PluginSettingsDialog';
import { Dialog } from "@/components/ui/dialog";
import ConfirmationDialog from '@/components/ConfirmationDialog';

function InstalledPluginCard({ plugin, botId, updateInfo, onToggle, onDelete, onUpdate, onOpenSettings, onFork }) {
    const navigate = useNavigate();
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

    return (
        <div className="flex items-start gap-4 p-4 border-b transition-colors hover:bg-muted/50 last:border-b-0">
            <div className="flex-grow">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{plugin.name}</h3>
                    {isNew && (
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge variant="success" className="bg-green-600/80 hover:bg-green-600">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Новое
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Установлен менее 24 часов назад</TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    от <span className="font-medium text-primary/90">{plugin.author || 'Неизвестный автор'}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">{plugin.description || 'Нет описания.'}</p>
                
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="outline">v{plugin.version}</Badge>
                    <Badge variant={plugin.sourceType === 'LOCAL' ? 'secondary' : 'default'}>{plugin.sourceType}</Badge>
                    {plugin.manifest?.categories?.map(category => (
                         <Badge key={category} variant="secondary">{category}</Badge>
                    ))}
                    {updateInfo && (
                        <Button size="sm" variant="ghost" className="h-auto px-2 py-1 text-green-400 hover:bg-green-900/50 hover:text-green-300" onClick={() => onUpdate.handle(plugin.id)} disabled={isUpdatingThisPlugin}>
                            {isUpdatingThisPlugin ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowUpCircle className="h-4 w-4 mr-1" />}
                            Обновить до v{updateInfo.recommendedVersion}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
                {isEditable && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/bots/${botId}/plugins/edit/${plugin.name}`)}>
                                <Code className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Редактировать код</p></TooltipContent>
                    </Tooltip>
                )}
                {isForkable && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onFork(plugin)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Создать локальную копию для редактирования</p></TooltipContent>
                    </Tooltip>
                )}
                {hasSettings && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!plugin.isEnabled} onClick={() => onOpenSettings(plugin)}>
                                <Settings className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Настройки плагина</p></TooltipContent>
                    </Tooltip>
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(plugin)} disabled={plugin.isEnabled}>
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Удалить (только выключенный плагин)</p></TooltipContent>
                </Tooltip>
                <Switch
                    checked={plugin.isEnabled}
                    onCheckedChange={(checked) => onToggle(plugin, checked)}
                    aria-label={plugin.isEnabled ? 'Выключить плагин' : 'Включить плагин'}
                />
            </div>
        </div>
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
    const [pluginToDelete, setPluginToDelete] = useState(null);

    const stats = useMemo(() => {
        const enabled = installedPlugins.filter(p => p.isEnabled).length;
        return {
            total: installedPlugins.length,
            enabled: enabled,
            disabled: installedPlugins.length - enabled,
            updates: Object.keys(updates).length,
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
            default:
                return sorted;
        }
    }, [installedPlugins, filter, updates]);

    return (
        <TooltipProvider delayDuration={100}>
            <div className="p-4 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4 shrink-0">
                    <Button variant={filter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>Все ({stats.total})</Button>
                    <Button variant={filter === 'enabled' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('enabled')}><Power className="mr-1 h-4 w-4"/>Включенные ({stats.enabled})</Button>
                    <Button variant={filter === 'disabled' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('disabled')}><PowerOff className="mr-1 h-4 w-4"/>Выключенные ({stats.disabled})</Button>
                    {stats.updates > 0 && <Button variant={filter === 'updates' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('updates')} className="text-green-400"><ArrowUpCircle className="mr-1 h-4 w-4"/>С обновлениями ({stats.updates})</Button>}
                </div>
                
                <div className="flex-grow overflow-y-auto border rounded-lg">
                    {sortedAndFilteredPlugins.length > 0 ? (
                        sortedAndFilteredPlugins.map((p) => (
                            <InstalledPluginCard
                                key={p.id}
                                plugin={p}
                                botId={bot.id}
                                updateInfo={updates[p.sourceUri]}
                                onToggle={onTogglePlugin}
                                onDelete={() => setPluginToDelete(p)}
                                onUpdate={{ handle: onUpdatePlugin, isUpdating: isUpdating }}
                                onOpenSettings={setSelectedPlugin}
                                onFork={onForkPlugin}
                            />
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full text-center p-10 text-muted-foreground">
                            Нет плагинов, соответствующих фильтру.
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