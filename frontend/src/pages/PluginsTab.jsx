import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('plugins');
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
    const reloadLocalPlugin = useAppStore(state => state.reloadLocalPlugin);

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
            const updatedPlugin = await forkPlugin(intBotId, plugin.name);
            if (updatedPlugin) {
                // Обновляем список плагинов чтобы отобразить изменение sourceType
                await fetchInstalledPlugins(intBotId);
                // Переходим в редактор (имя плагина не меняется)
                navigate(`/bots/${intBotId}/plugins/edit/${updatedPlugin.name}`);
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
            <div className="shrink-0 px-6 py-4 border-b">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{t('title')}</h1>
                        </div>
                        <TabsList className="h-9">
                            <TabsTrigger value="installed" className="flex items-center gap-1.5 text-xs">
                                <Package className="h-3.5 w-3.5" />
                                {t('tabs.installed')} ({installedPlugins.length})
                            </TabsTrigger>
                            <TabsTrigger value="browser" className="flex items-center gap-1.5 text-xs" disabled={!canInstall}>
                                <Puzzle className="h-3.5 w-3.5" />
                                {t('tabs.browser')}
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {Object.keys(updates).length > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                <Zap className="h-3 w-3 text-blue-500" />
                                <span className="text-xs font-medium text-blue-600">
                                    {Object.keys(updates).length}
                                </span>
                            </div>
                        )}
                        <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                        <span>
                        <Button onClick={handleCheckForUpdates} disabled={isCheckingUpdates || !canUpdate} size="sm" variant="ghost">
                            <RefreshCw className={`h-4 w-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                        </Button>
                        </span>
                        </TooltipTrigger>
                        <TooltipContent>{t('actions.checkUpdates')}</TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                        <Dialog open={isLocalInstallOpen} onOpenChange={setIsLocalInstallOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={!canInstall}>
                                    <FolderPlus className="h-4 w-4" />
                                    <span className="ml-2">{t('actions.installLocal')}</span>
                                </Button>
                            </DialogTrigger>
                            <LocalInstallDialog onInstall={handleLocalInstall} onCancel={() => setIsLocalInstallOpen(false)} isInstalling={isLocalInstalling} />
                        </Dialog>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)} size="sm" disabled={!canDevelop}>
                            <Code2 className="h-4 w-4" />
                            <span className="ml-2">{t('actions.createPlugin')}</span>
                        </Button>
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
                        onReloadPlugin={canDevelop ? ((plugin) => reloadLocalPlugin(intBotId, plugin.id)) : null}
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