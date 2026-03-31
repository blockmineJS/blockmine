import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import DependencyDialog from '@/components/DependencyDialog';
import PluginStoreCard from '@/components/PluginStoreCard';
import PluginListItem from '@/components/PluginListItem';
import * as Icons from 'lucide-react';
import { FixedSizeGrid, FixedSizeList } from 'react-window';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  PLUGIN_BROWSER_CATEGORIES,
  pluginMatchesCategory,
  translatePluginCategory,
} from '@/utils/pluginPresentation';

const SORT_OPTIONS = [
  { id: 'popular', icon: Icons.TrendingUp, labelKey: 'browser.sort.popular', defaultLabel: 'Популярные' },
  { id: 'newest', icon: Icons.Clock, labelKey: 'browser.sort.newest', defaultLabel: 'Новые' },
  { id: 'alphabetical', icon: Icons.ArrowDownAZ, labelKey: 'browser.sort.alphabetical', defaultLabel: 'По алфавиту' },
  { id: 'downloads', icon: Icons.Download, labelKey: 'browser.sort.downloads', defaultLabel: 'По загрузкам' },
];

export default function PluginBrowserView({ botId, isActive, installedPlugins, onInstallSuccess }) {
  const { t } = useTranslation('plugins');
  const catalog = useAppStore((state) => state.pluginCatalog);
  const isLoading = useAppStore((state) => state.isCatalogLoading);
  const fetchPluginCatalog = useAppStore((state) => state.fetchPluginCatalog);
  const installPluginFromRepo = useAppStore((state) => state.installPluginFromRepo);

  const [installingPlugins, setInstallingPlugins] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('plugin-browser-view-mode') || 'grid');
  const [dependencyDialogState, setDependencyDialogState] = useState({
    isOpen: false,
    mainPlugin: null,
    dependencies: [],
  });

  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!isActive) return;
    fetchPluginCatalog();
  }, [fetchPluginCatalog, isActive]);

  useEffect(() => {
    localStorage.setItem('plugin-browser-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

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

    setInstallingPlugins((previous) => new Set(previous).add(pluginToInstall.id));
    try {
      await installPluginFromRepo(botId, pluginToInstall.repoUrl, pluginToInstall.name);
      onInstallSuccess();
    } finally {
      setInstallingPlugins((previous) => {
        const next = new Set(previous);
        next.delete(pluginToInstall.id);
        return next;
      });
    }
  };

  const handleInstall = async (pluginToInstall) => {
    const requiredDependencyNames = pluginToInstall.dependencies || [];
    if (requiredDependencyNames.length === 0) {
      await installSinglePlugin(pluginToInstall);
      return;
    }

    const installedPluginNames = new Set(installedPlugins.map((plugin) => plugin.name));
    const catalogMapByName = new Map(catalog.map((plugin) => [plugin.name, plugin]));

    const allDependenciesWithStatus = requiredDependencyNames
      .map((dependencyName) => {
        const pluginInfo = catalogMapByName.get(dependencyName);
        return pluginInfo ? { ...pluginInfo, isInstalled: installedPluginNames.has(dependencyName) } : null;
      })
      .filter(Boolean);

    const missingDependencies = allDependenciesWithStatus.filter((dependency) => !dependency.isInstalled);

    if (missingDependencies.length > 0) {
      setDependencyDialogState({
        isOpen: true,
        mainPlugin: pluginToInstall,
        dependencies: allDependenciesWithStatus,
      });
      return;
    }

    await installSinglePlugin(pluginToInstall);
  };

  const confirmAndInstallAll = async () => {
    const { mainPlugin, dependencies } = dependencyDialogState;
    const missingDependencies = dependencies.filter((dependency) => !dependency.isInstalled);
    if (!mainPlugin) return;

    setDependencyDialogState({ isOpen: false, mainPlugin: null, dependencies: [] });

    for (const dependency of missingDependencies) {
      await installSinglePlugin(dependency);
    }

    await installSinglePlugin(mainPlugin);
  };

  const installedPluginUrls = useMemo(
    () => new Set(installedPlugins.map((plugin) => plugin.sourceUri)),
    [installedPlugins]
  );
  const installedPluginNames = useMemo(
    () => new Set(installedPlugins.map((plugin) => plugin.name)),
    [installedPlugins]
  );

  const filteredAndSortedCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = catalog.filter((plugin) => {
      const matchesCategory = pluginMatchesCategory(plugin.categories || [], selectedCategory);
      const matchesSearch =
        !query ||
        (plugin.displayName || plugin.name).toLowerCase().includes(query) ||
        (plugin.description || '').toLowerCase().includes(query) ||
        (plugin.author || '').toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
        break;
      case 'downloads':
      case 'popular':
      default:
        filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
    }

    return filtered;
  }, [catalog, searchQuery, selectedCategory, sortBy]);

  const isPluginInstalled = useCallback(
    (plugin) => installedPluginUrls.has(plugin.repoUrl) || installedPluginNames.has(plugin.name),
    [installedPluginNames, installedPluginUrls]
  );

  const isXl = useMediaQuery('(min-width: 1280px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isMd = useMediaQuery('(min-width: 768px)');

  const columnCount = useMemo(() => (isXl ? 4 : isLg ? 3 : isMd ? 2 : 1), [isMd, isLg, isXl]);
  const gridRowCount = Math.ceil(filteredAndSortedCatalog.length / columnCount);
  const columnWidth = size.width > 0 ? size.width / columnCount : 0;
  const gridRowHeight = 404;

  const Row = ({ index, style }) => {
    const plugin = filteredAndSortedCatalog[index];
    return (
      <div style={style} className="px-4 py-1">
        <PluginListItem
          key={plugin.id}
          plugin={plugin}
          botId={botId}
          isInstalled={isPluginInstalled(plugin)}
          isInstalling={installingPlugins.has(plugin.id)}
          onInstall={handleInstall}
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
        />
      </div>
    );
  };

  const selectedCategoryLabel = translatePluginCategory(selectedCategory, t);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-xl">
              <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('browser.search', { defaultValue: 'Поиск плагинов...' })}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(({ id, icon: Icon, labelKey, defaultLabel }) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {t(labelKey, { defaultValue: defaultLabel })}
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
                aria-label={t('browser.viewGrid', { defaultValue: 'Сетка' })}
              >
                <Icons.LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                aria-label={t('browser.viewList', { defaultValue: 'Список' })}
              >
                <Icons.List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {PLUGIN_BROWSER_CATEGORIES.map(({ id, iconName, color, defaultLabel }) => {
              const Icon = Icons[iconName] || Icons.LayoutGrid;
              return (
                <Button
                  key={id}
                  variant={selectedCategory === id ? 'default' : 'outline'}
                  className="h-8 whitespace-nowrap px-3"
                  onClick={() => setSelectedCategory(id)}
                >
                  <Icon className={color ? 'mr-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
                  {t(`categories.${id === 'all' ? 'allPlugins' : id}`, { defaultValue: defaultLabel })}
                </Button>
              );
            })}
            <Badge variant="outline" className="ml-auto shrink-0 px-3 py-1">
              <Icons.Package className="mr-2 h-4 w-4" />
              {t('browser.total', { count: catalog.length, defaultValue: 'Всего: {{count}}' })}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Icons.Loader2 className="mb-4 h-12 w-12 animate-spin" />
            <p className="text-lg">{t('browser.loadingCatalog', { defaultValue: 'Загрузка каталога плагинов...' })}</p>
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
          <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <Icons.PackageX className="mb-4 h-16 w-16 opacity-50" />
            <h3 className="text-xl font-semibold">{t('browser.emptyTitle', { defaultValue: 'Плагины не найдены' })}</h3>
            <p className="mt-2 max-w-md text-sm">
              {searchQuery
                ? t('browser.emptyDescription', {
                    category: selectedCategoryLabel,
                    query: searchQuery,
                    defaultValue: 'В категории "{{category}}" нет плагинов, соответствующих "{{query}}".',
                  })
                : t('browser.emptyDescriptionNoQuery', {
                    category: selectedCategoryLabel,
                    defaultValue: 'В категории "{{category}}" нет плагинов.',
                  })}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              <Icons.RotateCcw className="mr-2 h-4 w-4" />
              {t('browser.resetFilters', { defaultValue: 'Сбросить фильтры' })}
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={dependencyDialogState.isOpen}
        onOpenChange={(isOpen) =>
          !isOpen && setDependencyDialogState({ isOpen: false, mainPlugin: null, dependencies: [] })
        }
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
