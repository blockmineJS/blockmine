import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, FolderPlus, Code2 } from 'lucide-react';
import InstalledPluginsView from '@/components/InstalledPluginsView';
import PluginBrowserView from '@/components/PluginBrowserView';
import LocalInstallDialog from '@/components/LocalInstallDialog';
import { useAppStore } from '@/stores/appStore';
import CreatePluginDialog from '@/components/ide/CreatePluginDialog';

export default function PluginsTab() {
    const { botId } = useParams();
    const intBotId = parseInt(botId, 10);

    const allBots = useAppStore(state => state.bots);
    const allInstalledPlugins = useAppStore(state => state.installedPlugins);
    const allPluginUpdates = useAppStore(state => state.pluginUpdates);

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
    const [activeTab, setActiveTab] = useState('installed');
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

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <CardHeader className="shrink-0">
                <CardTitle>Управление плагинами</CardTitle>
                <CardDescription>Управляйте установленными плагинами или просматривайте каталог для установки новых.</CardDescription>
                <TabsList className="mt-2">
                    <TabsTrigger value="installed">Установленные ({installedPlugins.length})</TabsTrigger>
                    <TabsTrigger value="browser">Обзор</TabsTrigger>
                </TabsList>
            </CardHeader>
            
            <TabsContent value="installed" className="flex-grow flex flex-col min-h-0 data-[state=inactive]:hidden">
                <div className="p-4 border-b flex items-center gap-2 shrink-0">
                    <Button onClick={handleCheckForUpdates} disabled={isCheckingUpdates}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                        Проверить обновления
                    </Button>
                    <Dialog open={isLocalInstallOpen} onOpenChange={setIsLocalInstallOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" />Установить локально</Button>
                        </DialogTrigger>
                        <LocalInstallDialog onInstall={handleLocalInstall} onCancel={() => setIsLocalInstallOpen(false)} isInstalling={isLocalInstalling} />
                    </Dialog>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                        <Code2 className="mr-2 h-4 w-4" />
                        Создать плагин
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    <InstalledPluginsView 
                        bot={bot} 
                        installedPlugins={installedPlugins}
                        isLoading={isLoading}
                        updates={updates}
                        isUpdating={isUpdating}
                        onTogglePlugin={(plugin, isEnabled) => togglePlugin(intBotId, plugin.id, isEnabled)} 
                        onDeletePlugin={(plugin) => deletePlugin(intBotId, plugin.id, plugin.name)}
                        onUpdatePlugin={handleUpdatePlugin}
                        onSaveSettings={handlePluginOperationSuccess}
                        onForkPlugin={handleForkPlugin}
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