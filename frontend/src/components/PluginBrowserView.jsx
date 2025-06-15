import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import DependencyDialog from '@/components/DependencyDialog';
import PluginListItem from '@/components/PluginListItem';
import * as Icons from 'lucide-react';

const CATEGORIES = {
    "Все плагины": Icons.LayoutGrid,
    "Ядро": Icons.ShieldCheck,
    "Клан": Icons.Users,
    "Чат": Icons.MessageSquare,
    "Автоматизация": Icons.Bot,
    "Безопасность": Icons.ShieldBan,
    "Команды": Icons.TerminalSquare,
    "Утилиты": Icons.Wrench,
    "Права": Icons.KeyRound,
};

export default function PluginBrowserView({ botId, installedPlugins, onInstallSuccess }) {
    const catalog = useAppStore(state => state.pluginCatalog);
    const isLoading = useAppStore(state => state.isCatalogLoading);
    const fetchPluginCatalog = useAppStore(state => state.fetchPluginCatalog);
    const installPluginFromRepo = useAppStore(state => state.installPluginFromRepo);

    const [installingPlugins, setInstallingPlugins] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Все плагины');
    const [dependencyDialogState, setDependencyDialogState] = useState({
        isOpen: false, mainPlugin: null, dependencies: [],
    });

    useEffect(() => {
        fetchPluginCatalog();
    }, [fetchPluginCatalog]);

    const installSinglePlugin = async (pluginToInstall) => {
        if (!pluginToInstall) return;
        setInstallingPlugins(prev => new Set(prev).add(pluginToInstall.id));
        try {
            await installPluginFromRepo(botId, pluginToInstall.repoUrl, pluginToInstall.name);
            onInstallSuccess();
        } catch (error) {
        } finally {
            setInstallingPlugins(prev => {
                const newSet = new Set(prev);
                newSet.delete(pluginToInstall.id);
                return newSet;
            });
        }
    };

    const handleInstall = async (pluginToInstall) => {
        const requiredDepNames = pluginToInstall.dependencies || [];
        if (requiredDepNames.length === 0) {
            await installSinglePlugin(pluginToInstall);
            return;
        }

        const installedPluginNames = new Set(installedPlugins.map(p => p.name));
        const catalogMapByName = new Map(catalog.map(p => [p.name, p]));
        
        const allDepsWithStatus = requiredDepNames
            .map(depName => {
                const pluginInfo = catalogMapByName.get(depName);
                return pluginInfo ? { ...pluginInfo, isInstalled: installedPluginNames.has(depName) } : null;
            })
            .filter(Boolean);

        const missingDeps = allDepsWithStatus.filter(dep => !dep.isInstalled);
        
        if (missingDeps.length > 0) {
            setDependencyDialogState({
                isOpen: true, mainPlugin: pluginToInstall, dependencies: allDepsWithStatus,
            });
            return;
        }
        
        await installSinglePlugin(pluginToInstall);
    };
    
    const confirmAndInstallAll = async () => {
        const { mainPlugin, dependencies } = dependencyDialogState;
        const toInstall = dependencies.filter(dep => !dep.isInstalled);
        if (!mainPlugin) return;

        setDependencyDialogState({ isOpen: false, mainPlugin: null, dependencies: [] });

        for (const dep of toInstall) {
            await installSinglePlugin(dep);
        }
        await installSinglePlugin(mainPlugin);
    };

    const installedPluginUrls = useMemo(() => new Set(installedPlugins.map(p => p.sourceUri)), [installedPlugins]);
    
    const filteredCatalog = useMemo(() => {
        return catalog.filter(plugin => {
            const searchLower = searchQuery.toLowerCase();
            const matchesCategory = selectedCategory === 'Все плагины' || (plugin.categories && plugin.categories.includes(selectedCategory));
            const matchesSearch = !searchQuery || plugin.name.toLowerCase().includes(searchLower) || plugin.description.toLowerCase().includes(searchLower);
            return matchesCategory && matchesSearch;
        });
    }, [catalog, searchQuery, selectedCategory]);

    return (
        <div className="flex h-full">
            <aside className="w-64 border-r p-4 flex flex-col gap-4 shrink-0">
                <Input
                    placeholder="Поиск плагинов..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <nav className="flex flex-col gap-1">
                    {Object.entries(CATEGORIES).map(([name, Icon]) => (
                        <Button
                            key={name}
                            variant={selectedCategory === name ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => setSelectedCategory(name)}
                        >
                            <Icon className="mr-2 h-4 w-4" />
                            {name}
                        </Button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 flex flex-col">
                <div className="p-6 shrink-0">
                    <h2 className="text-2xl font-bold tracking-tight">
                        {selectedCategory}
                    </h2>
                    <p className="text-muted-foreground">
                        Найдено: {filteredCatalog.length}
                    </p>
                </div>

                <div className="flex-grow border-t overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Загрузка каталога...</div>
                    ) : filteredCatalog.length > 0 ? (
                        filteredCatalog.map(plugin => (
                            <PluginListItem 
                                key={plugin.id}
                                plugin={plugin}
                                botId={botId}
                                isInstalled={installedPluginUrls.has(plugin.repoUrl)}
                                isInstalling={installingPlugins.has(plugin.id)}
                                onInstall={handleInstall}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                            <Icons.PackageX className="h-16 w-16 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">Плагины не найдены</h3>
                            <p className="text-sm">В категории "{selectedCategory}" нет плагинов, соответствующих вашему запросу.</p>
                        </div>
                    )}
                </div>
            </main>

            <Dialog 
                open={dependencyDialogState.isOpen} 
                onOpenChange={(isOpen) => !isOpen && setDependencyDialogState({ isOpen: false, mainPlugin: null, dependencies: [] })}
            >
                {dependencyDialogState.mainPlugin && (
                    <DependencyDialog 
                        mainPlugin={dependencyDialogState.mainPlugin}
                        dependencies={dependencyDialogState.dependencies}
                        onConfirm={confirmAndInstallAll}
                        onCancel={() => setDependencyDialogState({ isOpen: false, mainPlugin: null, dependencies: [] })}
                        isInstalling={installingPlugins.size > 0}
                    />
                )}
            </Dialog>
        </div>
    );
}