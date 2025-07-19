import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DependencyDialog from '@/components/DependencyDialog';
import PluginStoreCard from '@/components/PluginStoreCard';
import PluginListItem from '@/components/PluginListItem';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = {
    "Все плагины": { icon: Icons.LayoutGrid, color: "from-blue-500 to-purple-500" },
    "Ядро": { icon: Icons.ShieldCheck, color: "from-green-500 to-emerald-500" },
    "Клан": { icon: Icons.Users, color: "from-orange-500 to-red-500" },
    "Чат": { icon: Icons.MessageSquare, color: "from-purple-500 to-pink-500" },
    "Автоматизация": { icon: Icons.Bot, color: "from-cyan-500 to-blue-500" },
    "Безопасность": { icon: Icons.ShieldBan, color: "from-red-500 to-rose-500" },
    "Команды": { icon: Icons.TerminalSquare, color: "from-gray-500 to-gray-700" },
    "Утилиты": { icon: Icons.Wrench, color: "from-yellow-500 to-amber-500" },
    "Права": { icon: Icons.KeyRound, color: "from-indigo-500 to-purple-500" },
};

const SORT_OPTIONS = {
    popular: { label: "Популярные", icon: Icons.TrendingUp },
    newest: { label: "Новые", icon: Icons.Clock },
    alphabetical: { label: "По алфавиту", icon: Icons.ArrowDownAZ },
    downloads: { label: "По загрузкам", icon: Icons.Download }
};

export default function PluginBrowserView({ botId, installedPlugins, onInstallSuccess }) {
    const catalog = useAppStore(state => state.pluginCatalog);
    const isLoading = useAppStore(state => state.isCatalogLoading);
    const fetchPluginCatalog = useAppStore(state => state.fetchPluginCatalog);
    const installPluginFromRepo = useAppStore(state => state.installPluginFromRepo);

    const [installingPlugins, setInstallingPlugins] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Все плагины');
    const [sortBy, setSortBy] = useState('popular');
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('plugin-browser-view-mode');
        return saved || 'grid';
    });
    const [dependencyDialogState, setDependencyDialogState] = useState({
        isOpen: false, mainPlugin: null, dependencies: [],
    });

    useEffect(() => {
        fetchPluginCatalog();
    }, [fetchPluginCatalog]);

    useEffect(() => {
        localStorage.setItem('plugin-browser-view-mode', viewMode);
    }, [viewMode]);

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
    const installedPluginNames = useMemo(() => new Set(installedPlugins.map(p => p.name)), [installedPlugins]);
    
    const filteredAndSortedCatalog = useMemo(() => {
        let filtered = catalog.filter(plugin => {
            const searchLower = searchQuery.toLowerCase();
            const matchesCategory = selectedCategory === 'Все плагины' || (plugin.categories && plugin.categories.includes(selectedCategory));
            const matchesSearch = !searchQuery || 
                (plugin.displayName || plugin.name).toLowerCase().includes(searchLower) || 
                plugin.description.toLowerCase().includes(searchLower) ||
                plugin.author.toLowerCase().includes(searchLower);
            return matchesCategory && matchesSearch;
        });

        switch(sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                break;
            case 'alphabetical':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'downloads':
                filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                break;
            case 'popular':
            default:
                filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                break;
        }

        return filtered;
    }, [catalog, searchQuery, selectedCategory, sortBy]);

    const isPluginInstalled = useCallback((plugin) => {
        if (installedPluginUrls.has(plugin.repoUrl)) {
            return true;
        }
        if (installedPluginNames.has(plugin.name)) {
            return true;
        }
        return false;
    }, [installedPluginUrls, installedPluginNames]);

    return (
        <div className="flex h-full">
            <aside className="w-64 border-r p-4 flex flex-col gap-4 shrink-0 bg-muted/30">
                <div className="space-y-4">
                    <Input
                        placeholder="Поиск плагинов..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                        prefix={<Icons.Search className="h-4 w-4 text-muted-foreground" />}
                    />
                    
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(SORT_OPTIONS).map(([key, { label, icon: Icon }]) => (
                                <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <nav className="flex flex-col gap-1">
                        {Object.entries(CATEGORIES).map(([name, { icon: Icon, color }]) => (
                            <Button
                                key={name}
                                variant={selectedCategory === name ? "secondary" : "ghost"}
                                className={cn(
                                    "justify-start category-button transition-all",
                                    selectedCategory === name && "bg-gradient-to-r text-white hover:text-white",
                                    selectedCategory === name && color
                                )}
                                onClick={() => setSelectedCategory(name)}
                            >
                                <Icon className="mr-2 h-4 w-4 category-icon" />
                                {name}
                            </Button>
                        ))}
                    </nav>
                </div>

                <div className="border-t pt-4">
                    <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="grid" className="flex items-center gap-2">
                                <Icons.LayoutGrid className="h-4 w-4" />
                                Сетка
                            </TabsTrigger>
                            <TabsTrigger value="list" className="flex items-center gap-2">
                                <Icons.List className="h-4 w-4" />
                                Список
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 shrink-0 bg-gradient-to-r from-background to-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight gradient-text">
                                {selectedCategory}
                            </h2>
                            <p className="text-muted-foreground mt-1">
                                Найдено: <span className="font-semibold">{filteredAndSortedCatalog.length}</span> плагинов
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="px-3 py-1">
                                <Icons.Package className="h-4 w-4 mr-2" />
                                Всего: {catalog.length}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Icons.Loader2 className="h-12 w-12 animate-spin mb-4" />
                            <p className="text-lg">Загрузка каталога плагинов...</p>
                        </div>
                    ) : filteredAndSortedCatalog.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-500">
                                {filteredAndSortedCatalog.map((plugin, index) => (
                                    <div
                                        key={plugin.id}
                                        className="animate-in slide-in-from-bottom duration-300"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <PluginStoreCard
                                            plugin={plugin}
                                            botId={botId}
                                            isInstalled={isPluginInstalled(plugin)}
                                            isInstalling={installingPlugins.has(plugin.id)}
                                            onInstall={handleInstall}
                                            allPlugins={catalog}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredAndSortedCatalog.map(plugin => (
                                    <PluginListItem 
                                        key={plugin.id}
                                        plugin={plugin}
                                        botId={botId}
                                        isInstalled={isPluginInstalled(plugin)}
                                        isInstalling={installingPlugins.has(plugin.id)}
                                        onInstall={handleInstall}
                                        allPlugins={catalog}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                            <Icons.PackageX className="h-16 w-16 mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold">Плагины не найдены</h3>
                            <p className="text-sm mt-2 max-w-md">
                                В категории "{selectedCategory}" нет плагинов, соответствующих вашему запросу "{searchQuery}".
                            </p>
                            <Button 
                                variant="outline" 
                                className="mt-4"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('Все плагины');
                                }}
                            >
                                <Icons.RotateCcw className="h-4 w-4 mr-2" />
                                Сбросить фильтры
                            </Button>
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