import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, FolderPlus, Code2, Puzzle, Package, Sparkles, Zap } from 'lucide-react';
import InstalledPluginsView from '@/components/InstalledPluginsView';
import PluginBrowserView from '@/components/PluginBrowserView';
import LocalInstallDialog from '@/components/LocalInstallDialog';
import { useAppStore } from '@/stores/appStore';
import CreatePluginDialog from '@/components/ide/CreatePluginDialog';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PluginsTab() {
    const { botId } = useParams();
    const intBotId = parseInt(botId, 10);

    const allBots = useAppStore(state => state.bots);
    const allInstalledPlugins = useAppStore(state => state.installedPlugins);
    const allPluginUpdates = useAppStore(state => state.pluginUpdates);
    const hasPermission = useAppStore(state => state.hasPermission);

    const bot = useMemo(() => allBots.find(b => b.id === intBotId), [allBots, intBotId]);
    const installedPlugins = useMemo(() => allInstalledPlugins[intBotId] || [], [allInstalledPlugins, intBotId]);
    const updates = useMemo(() => allPluginUpdates[intBotId] || {}, [allPluginUpdates, intBotId]);

    const fetchInstalledPlugins = useAppStore(state => state.fetchInstalledPlugins);
    const checkForUpdates = useAppStore(state => state.checkForUpdates);
    const togglePlugin = useAppStore(state => state.togglePlugin);
    const deletePlugin = useAppStore(state => state.deletePlugin);
    const updatePlugin = useAppStore(state => state.updatePlugin);
    const installPluginFromPath = useAppStore(state => state.installPluginFromPath);
    const fetchPluginCatalog = useAppStore(state => state.fetchPluginCatalog);
    const forkPlugin = useAppStore(state => state.forkPlugin);
    const createIdePlugin = useAppStore(state => state.createIdePlugin);

    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [isUpdating, setIsUpdating] = useState(null);
    const [isLocalInstallOpen, setIsLocalInstallOpen] = useState(false);
    const [isLocalInstalling, setIsLocalInstalling] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isForking, setIsForking] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('plugins-active-tab');
        return saved || 'installed';
    });
    const navigate = useNavigate();

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            await fetchPluginCatalog();
            await fetchInstalledPlugins(intBotId);
            setIsLoading(false);
        };
        if (bot) {
            loadInitialData();
        }
    }, [bot, intBotId, fetchInstalledPlugins, fetchPluginCatalog]);

    useEffect(() => {
        if (activeTab === 'installed' && bot && installedPlugins.length > 0 && !isLoading) {
            checkForUpdates(intBotId, false);
        }
    }, [installedPlugins.length, isLoading, activeTab, bot, intBotId, checkForUpdates]);

    const handleCheckForUpdates = async () => {
        setIsCheckingUpdates(true);
        await checkForUpdates(intBotId, true);
        setIsCheckingUpdates(false);
    };

    const handleTabChange = (value) => {
        setActiveTab(value);
        localStorage.setItem('plugins-active-tab', value);
    };
    
    const handleCreatePlugin = async ({ name, template }) => {
        try {
            const newPlugin = await createIdePlugin(intBotId, { name, template });
            if (newPlugin) {
                navigate(`/bots/${intBotId}/plugins/edit/${newPlugin.name}`);
            }
        } catch (error) {
        }
    };
    
    const handleForkPlugin = async (plugin) => {
        setIsForking(true);
        try {
            const forkedPlugin = await forkPlugin(intBotId, plugin.name);
            if (forkedPlugin) {
                navigate(`/bots/${intBotId}/plugins/edit/${forkedPlugin.name}`);
            }
        } finally {
            setIsForking(false);
        }
    };
    
    const handleUpdatePlugin = async (pluginId) => {
        setIsUpdating(pluginId);
        await updatePlugin(pluginId, intBotId);
        setIsUpdating(null);
    };

    const handleLocalInstall = async (path) => {
        setIsLocalInstalling(true);
        try {
            await installPluginFromPath(intBotId, path);
            setIsLocalInstallOpen(false);
        } finally {
            setIsLocalInstalling(false);
        }
    };
    
    const handlePluginOperationSuccess = () => {
        fetchInstalledPlugins(intBotId);
    };

    if (!bot) return null;

    const canInstall = hasPermission('plugin:install');
    const canDelete = hasPermission('plugin:delete');
    const canUpdate = hasPermission('plugin:update');
    const canDevelop = hasPermission('plugin:develop');

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <div className="shrink-0 p-6 bg-gradient-to-br from-background via-muted/20 to-background border-b">
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-sm opacity-20" />
                        <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                            <Puzzle className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Управление плагинами
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Расширяйте возможности бота с помощью плагинов
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                            <Sparkles className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-medium text-green-600">
                                {installedPlugins.length} установлено
                            </span>
                        </div>
                        {Object.keys(updates).length > 0 && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full animate-pulse">
                                <Zap className="h-3 w-3 text-blue-500" />
                                <span className="text-xs font-medium text-blue-600">
                                    {Object.keys(updates).length} обновлений
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50 backdrop-blur-sm border border-border/50">
                        <TabsTrigger value="installed" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Установленные ({installedPlugins.length})
                        </TabsTrigger>
                        <TabsTrigger value="browser" className="flex items-center gap-2" disabled={!canInstall}>
                            <Puzzle className="h-4 w-4" />
                            Обзор
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                        <span>
                        <Button onClick={handleCheckForUpdates} disabled={isCheckingUpdates || !canUpdate} size="sm">
                            <RefreshCw className={`mr-2 h-4 w-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                            Проверить обновления
                        </Button>
                        </span>
                        </TooltipTrigger>
                        {!canUpdate && <TooltipContent>Недостаточно прав для обновления плагинов</TooltipContent>}
                        </Tooltip>
                        </TooltipProvider>
                        <Dialog open={isLocalInstallOpen} onOpenChange={setIsLocalInstallOpen}>
                            <DialogTrigger asChild>
                                <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                <span>
                                <Button variant="outline" size="sm" disabled={!canInstall}>
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    Установить локально
                                </Button>
                                </span>
                                </TooltipTrigger>
                                {!canInstall && <TooltipContent>Недостаточно прав для установки плагинов</TooltipContent>}
                                </Tooltip>
                                </TooltipProvider>
                            </DialogTrigger>
                            <LocalInstallDialog onInstall={handleLocalInstall} onCancel={() => setIsLocalInstallOpen(false)} isInstalling={isLocalInstalling} />
                        </Dialog>
                        <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                        <span>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)} size="sm" disabled={!canDevelop}>
                            <Code2 className="mr-2 h-4 w-4" />
                            Создать плагин
                        </Button>
                        </span>
                        </TooltipTrigger>
                        {!canDevelop && <TooltipContent>Недостаточно прав для разработки плагинов</TooltipContent>}
                        </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
            
            <TabsContent value="installed" className="flex-grow flex flex-col min-h-0 data-[state=inactive]:hidden">
                <div className="flex-1 overflow-y-auto">
                    <InstalledPluginsView 
                        bot={bot} 
                        installedPlugins={installedPlugins}
                        isLoading={isLoading}
                        updates={updates}
                        isUpdating={isUpdating}
                        onTogglePlugin={canUpdate ? ((plugin, isEnabled) => togglePlugin(intBotId, plugin.id, isEnabled)) : null}
                        onDeletePlugin={canDelete ? ((plugin) => deletePlugin(intBotId, plugin.id, plugin.name)) : null}
                        onUpdatePlugin={canUpdate ? ((pluginId) => handleUpdatePlugin(pluginId)) : null}
                        onSaveSettings={handlePluginOperationSuccess}
                        onForkPlugin={canDevelop ? ((plugin) => handleForkPlugin(plugin)) : null}
                    />
                </div>
            </TabsContent>
            
            <TabsContent value="browser" className="flex-grow flex flex-col min-h-0 data-[state=inactive]:hidden">
                <PluginBrowserView 
                    botId={intBotId}
                    installedPlugins={installedPlugins}
                    onInstallSuccess={handlePluginOperationSuccess}
                />
            </TabsContent>

            <CreatePluginDialog 
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onCreate={handleCreatePlugin}
            />
        </Tabs>
    );
}