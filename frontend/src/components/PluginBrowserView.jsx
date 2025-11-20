import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { FixedSizeList, FixedSizeGrid } from 'react-window';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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

    const containerRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        fetchPluginCatalog();
    }, [fetchPluginCatalog]);

    useEffect(() => {
        localStorage.setItem('plugin-browser-view-mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver(() => {
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                setSize({ width: container.offsetWidth, height: container.offsetHeight });
            }
        });
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

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

    const isXl = useMediaQuery("(min-width: 1280px)");
    const isLg = useMediaQuery("(min-width: 1024px)");
    const isMd = useMediaQuery("(min-width: 768px)");

    const columnCount = useMemo(() => (isXl ? 4 : isLg ? 3 : isMd ? 2 : 1), [isXl, isLg, isMd]);
    const gridRowCount = Math.ceil(filteredAndSortedCatalog.length / columnCount);
    const columnWidth = size.width > 0 ? size.width / columnCount : 0;
    const gridRowHeight = 420;

    const Row = ({ index, style }) => {
        const plugin = filteredAndSortedCatalog[index];
        return (
            <div style={style} className="py-1 px-4">
                <PluginListItem 
                    key={plugin.id}
                    plugin={plugin}
                    botId={botId}
                    isInstalled={isPluginInstalled(plugin)}
                    isInstalling={installingPlugins.has(plugin.id)}
                    onInstall={handleInstall}
                    allPlugins={catalog}
                />
            </div>
        );
    };

    const Cell = ({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * columnCount + columnIndex;
        if (index >= filteredAndSortedCatalog.length) {
            return null;
        }
        const plugin = filteredAndSortedCatalog[index];
        return (
            <div style={style} className="p-2">
                <PluginStoreCard
                    key={plugin.id}
                    plugin={plugin}
                    botId={botId}
                    isInstalled={isPluginInstalled(plugin)}
                    isInstalling={installingPlugins.has(plugin.id)}
                    onInstall={handleInstall}
                    allPlugins={catalog}
                />
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col">
            <div className="border-b bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative w-full max-w-xl">
                            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Поиск плагинов..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[160px]">
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

                        <div className="ml-auto flex items-center gap-1">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                onClick={() => setViewMode('grid')}
                                aria-label="Сетка"
                            >
                                <Icons.LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                onClick={() => setViewMode('list')}
                                aria-label="Список"
                            >
                                <Icons.List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto">
                        {Object.entries(CATEGORIES).map(([name, { icon: Icon }]) => (
                            <Button
                                key={name}
                                variant={selectedCategory === name ? 'default' : 'outline'}
                                className="h-8 px-3 whitespace-nowrap"
                                onClick={() => setSelectedCategory(name)}
                            >
                                <Icon className="mr-2 h-4 w-4" />
                                {name}
                            </Button>
                        ))}
                        <Badge variant="outline" className="ml-auto px-3 py-1 shrink-0">
                            <Icons.Package className="h-4 w-4 mr-2" />
                            Всего: {catalog.length}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden" ref={containerRef}>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Icons.Loader2 className="h-12 w-12 animate-spin mb-4" />
                        <p className="text-lg">Загрузка каталога плагинов...</p>
                    </div>
                ) : filteredAndSortedCatalog.length > 0 && size.width > 0 ? (
                    viewMode === 'grid' ? (
                        <FixedSizeGrid
                            height={size.height}
                            width={size.width}
                            columnCount={columnCount}
                            columnWidth={columnWidth}
                            rowCount={gridRowCount}
                            rowHeight={gridRowHeight}
                            overscanRowCount={1}
                            overscanColumnCount={1}
                        >
                            {Cell}
                        </FixedSizeGrid>
                    ) : (
                        <FixedSizeList
                            height={size.height}
                            width={size.width}
                            itemCount={filteredAndSortedCatalog.length}
                            itemSize={170}
                            overscanCount={5}
                        >
                            {Row}
                        </FixedSizeList>
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