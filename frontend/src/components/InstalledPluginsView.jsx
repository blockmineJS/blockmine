import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import PluginSettingsDialog from '@/components/PluginSettingsDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import FadeTransition from '@/components/FadeTransition';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import {
  Activity,
  ArrowUpCircle,
  Clock,
  Code,
  Copy,
  GitBranch,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Power,
  PowerOff,
  RefreshCw,
  Settings,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react';
import { translatePluginCategory, translatePluginSourceType } from '@/utils/pluginPresentation';

const IconComponent = ({ name, ...props }) => {
  if (!name) return <Package {...props} />;
  if (name.startsWith('/') || name.startsWith('http')) return <img src={name} alt="plugin icon" {...props} />;
  const iconName = name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const LucideIcon = Icons[iconName] || Package;
  return <LucideIcon {...props} />;
};

const formatPluginSourceRef = (plugin) => {
  if (!plugin?.sourceRef) return null;
  if (plugin.sourceRefType === 'tag') return `tag:${plugin.sourceRef}`;
  if (plugin.sourceRefType === 'branch') return `branch:${plugin.sourceRef}`;
  return plugin.sourceRef;
};

const getUpdateVersionLabel = (updateInfo) => {
  const raw = updateInfo?.recommendedVersion || updateInfo?.latestTag || updateInfo?.targetTag || null;
  if (!raw) return null;
  return String(raw).replace(/^v/i, '');
};

const formatRelativeDate = (dateValue, t) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  const days = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
  if (days === 0) return t('installed.lastUpdated.today', { defaultValue: 'Сегодня' });
  if (days === 1) return t('installed.lastUpdated.yesterday', { defaultValue: 'Вчера' });
  if (days < 7) return t('installed.lastUpdated.daysAgo', { count: days, defaultValue: '{{count}} дней назад' });
  if (days < 30) {
    return t('installed.lastUpdated.weeksAgo', {
      count: Math.floor(days / 7),
      defaultValue: '{{count}} недель назад',
    });
  }
  return t('installed.lastUpdated.monthsAgo', {
    count: Math.floor(days / 30),
    defaultValue: '{{count}} месяцев назад',
  });
};

const getInstalledMetaBadges = (plugin, t) => {
  const badges = [
    { key: 'version', label: `v${plugin.version}`, variant: 'outline' },
    {
      key: 'source',
      label: translatePluginSourceType(plugin.sourceType, t),
      variant: plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE' ? 'secondary' : 'outline',
      icon: plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE' ? Code : GitBranch,
    },
  ];
  const sourceRef = formatPluginSourceRef(plugin);
  if (sourceRef) badges.push({ key: 'source-ref', label: sourceRef, variant: 'outline' });
  for (const category of plugin.manifest?.categories || []) {
    badges.push({
      key: `category-${category}`,
      label: translatePluginCategory(category, t),
      variant: 'secondary',
    });
  }
  return badges;
};

const TOGGLE_LOCK_MS = 220;
const FILTER_LAYOUT_TRANSITION = { type: 'spring', stiffness: 420, damping: 34, mass: 0.72 };
const FILTER_FADE_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

function InstalledPluginCard({
  plugin,
  botId,
  updateInfo,
  onToggle,
  onDelete,
  onUpdate,
  onOpenSettings,
  onFork,
  onReload,
  viewMode = 'grid',
}) {
  const { t } = useTranslation('plugins');
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(plugin.isEnabled);
  const [isTogglePending, setIsTogglePending] = useState(false);
  const toggleLockRef = useRef(false);
  const toggleCooldownTimeoutRef = useRef(null);
  const hasSettings = plugin.manifest?.settings && Object.keys(plugin.manifest.settings).length > 0;
  const isUpdatingThisPlugin = onUpdate && onUpdate.isUpdating === plugin.id;
  const updateVersion = getUpdateVersionLabel(updateInfo);
  const hasUpdateAction = Boolean(updateInfo && onUpdate);
  const isEditable = plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE';
  const isForkable = plugin.sourceType === 'GITHUB';
  const displayEnabled = localEnabled;
  const description = plugin.description || t('labels.noDescription', { defaultValue: 'Нет описания.' });
  const authorLabel = plugin.author || t('labels.unknownAuthor', { defaultValue: 'Неизвестный автор' });

  const isNew = useMemo(() => {
    if (!plugin.createdAt) return false;
    return Date.now() - new Date(plugin.createdAt) < 24 * 60 * 60 * 1000;
  }, [plugin.createdAt]);

  const lastUpdated = useMemo(() => formatRelativeDate(plugin.updatedAt, t), [plugin.updatedAt, t]);
  const metaBadges = useMemo(() => getInstalledMetaBadges(plugin, t), [plugin, t]);
  const visibleMetaBadges = metaBadges.slice(0, 4);
  const hiddenMetaBadgeCount = Math.max(0, metaBadges.length - visibleMetaBadges.length);

  const clearToggleCooldown = () => {
    if (toggleCooldownTimeoutRef.current) {
      window.clearTimeout(toggleCooldownTimeoutRef.current);
      toggleCooldownTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    clearToggleCooldown();
    toggleLockRef.current = false;
    setIsTogglePending(false);
    return () => clearToggleCooldown();
  }, [plugin.id]);

  useEffect(() => {
    if (isTogglePending || toggleLockRef.current) return;
    setLocalEnabled(plugin.isEnabled);
  }, [plugin.isEnabled, isTogglePending]);

  const handleToggleChange = async (checked) => {
    if (!onToggle || isTogglePending || toggleLockRef.current) return;
    toggleLockRef.current = true;
    const previousEnabled = localEnabled;
    const startedAt = Date.now();
    setLocalEnabled(checked);
    setIsTogglePending(true);
    try {
      await onToggle(plugin, checked);
    } catch {
      setLocalEnabled(previousEnabled);
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, TOGGLE_LOCK_MS - elapsed);
      clearToggleCooldown();
      toggleCooldownTimeoutRef.current = window.setTimeout(() => {
        setIsTogglePending(false);
        toggleLockRef.current = false;
        toggleCooldownTimeoutRef.current = null;
      }, remaining);
    }
  };

  const renderUpdateTooltip = () =>
    isUpdatingThisPlugin
      ? t('installed.updateInProgress', { defaultValue: 'Обновление...' })
      : updateVersion
        ? t('tooltips.updateTo', { version: updateVersion, defaultValue: 'Обновить до {{version}}' })
        : t('tooltips.updateAvailable', { defaultValue: 'Доступно обновление' });

  const renderActions = ({ compact = false } = {}) => (
    <>
      {isEditable && onFork && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={compact ? 'ghost' : 'outline'}
              size={compact ? 'icon' : 'sm'}
              className={cn(compact ? 'h-8 w-8' : hasUpdateAction ? 'h-9 w-9 shrink-0 px-0' : 'h-9 min-w-0 flex-1')}
              onClick={() => navigate(`/bots/${botId}/plugins/edit/${plugin.name}`)}
            >
              <Code className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('tooltips.editCode', { defaultValue: 'Редактировать код' })}</TooltipContent>
        </Tooltip>
      )}
      {isEditable && onReload && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={compact ? 'ghost' : 'outline'}
              size={compact ? 'icon' : 'sm'}
              className={cn(compact ? 'h-8 w-8' : hasUpdateAction ? 'h-9 w-9 shrink-0 px-0' : 'h-9 min-w-0 flex-1')}
              onClick={() => onReload(plugin)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('tooltips.reloadFromPackage', { defaultValue: 'Перезагрузить из package.json' })}</TooltipContent>
        </Tooltip>
      )}
      {isForkable && onFork && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={compact ? 'ghost' : 'outline'}
              size={compact ? 'icon' : 'sm'}
              className={cn(compact ? 'h-8 w-8' : hasUpdateAction ? 'h-9 w-9 shrink-0 px-0' : 'h-9 min-w-0 flex-1')}
              onClick={() => onFork(plugin)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('tooltips.makeLocal', { defaultValue: 'Сделать локальным' })}</TooltipContent>
        </Tooltip>
      )}
      {hasSettings && onOpenSettings && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={compact ? 'ghost' : 'outline'}
              size={compact ? 'icon' : 'sm'}
              className={cn(compact ? 'h-8 w-8' : hasUpdateAction ? 'h-9 w-9 shrink-0 px-0' : 'h-9 min-w-0 flex-1')}
              onClick={() => onOpenSettings(plugin)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('tooltips.settings', { defaultValue: 'Настройки' })}</TooltipContent>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={compact ? 'ghost' : 'outline'}
              size={compact ? 'icon' : 'sm'}
              className={cn(compact ? 'h-8 w-8' : hasUpdateAction ? 'h-9 w-9 shrink-0 px-0' : 'h-9 min-w-0 flex-1')}
              onClick={() => onDelete(plugin)}
              disabled={displayEnabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('tooltips.delete', { defaultValue: 'Удалить' })}</TooltipContent>
        </Tooltip>
      )}
    </>
  );

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'plugin-card-hover group relative flex h-[150px] items-start gap-4 rounded-lg border p-4',
          'hover:border-primary/50 hover:bg-muted/50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-1 rounded-l-lg bg-green-500 transition-[opacity,transform] duration-300 ease-out',
            displayEnabled ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
          )}
        />

        <div className="relative mt-1 shrink-0">
          <IconComponent
            name={plugin.manifest?.icon}
            className={cn(
              'h-10 w-10 transform-gpu transition-transform duration-300 ease-out group-hover:scale-105',
              displayEnabled ? 'text-primary' : 'text-muted-foreground',
              isHovered && 'drop-shadow-glow'
            )}
          />
          {isNew && <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-green-500" />}
        </div>

        <div className="min-w-0 flex-grow">
          <div className="mb-1 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to={`/bots/${botId}/plugins/view/${plugin.name}`} className="cursor-pointer truncate text-lg font-semibold transition-colors hover:text-primary">
                  {plugin.displayName || plugin.name}
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="text-muted-foreground">{t('labels.pluginId', { defaultValue: 'ID плагина:' })}</div>
                  <div className="font-mono">{plugin.name}</div>
                </div>
              </TooltipContent>
            </Tooltip>

            {isNew && (
              <Badge className="border-0 bg-gradient-to-r from-green-500 to-emerald-500 text-xs text-white">
                <Sparkles className="mr-1 h-3 w-3" />
                {t('badges.new', { defaultValue: 'Новое' })}
              </Badge>
            )}
            {updateInfo && (
              <Badge className="border-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-xs text-white">
                <ArrowUpCircle className="mr-1 h-3 w-3" />
                {t('badges.update', { defaultValue: 'Обновление' })}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {t('labels.by', { defaultValue: 'от' })} <span className="font-medium text-primary/90">{authorLabel}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-5 px-2 text-xs">v{plugin.version}</Badge>
            <Badge
              variant={plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE' ? 'secondary' : 'outline'}
              className="h-5 px-2 text-xs"
            >
              {plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE'
                ? <Code className="mr-1 h-3 w-3" />
                : <GitBranch className="mr-1 h-3 w-3" />}
              {translatePluginSourceType(plugin.sourceType, t)}
            </Badge>
            {formatPluginSourceRef(plugin) && (
              <Badge variant="outline" className="h-5 px-2 text-xs">
                {formatPluginSourceRef(plugin)}
              </Badge>
            )}
            {plugin.manifest?.categories?.slice(0, 2).map((category) => (
              <Badge key={category} variant="secondary" className="h-5 px-2 text-xs">
                {translatePluginCategory(category, t)}
              </Badge>
            ))}
            {updateInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className="h-5 cursor-pointer whitespace-nowrap border-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-2 text-xs text-white"
                    onClick={() => {
                      if (isUpdatingThisPlugin) return;
                      onUpdate?.handle(plugin.id);
                    }}
                  >
                    {isUpdatingThisPlugin ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowUpCircle className="mr-1 h-3 w-3" />}
                    {updateVersion ? `v${updateVersion}` : t('labels.updateAvailable', { defaultValue: 'Update' })}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{renderUpdateTooltip()}</TooltipContent>
              </Tooltip>
            )}
            {lastUpdated && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {lastUpdated}
              </span>
            )}
          </div>
        </div>

        <div className="ml-4 flex shrink-0 items-center gap-2">
          <div className="flex gap-1">{renderActions({ compact: true })}</div>
          <Switch
            checked={displayEnabled}
            onCheckedChange={handleToggleChange}
            disabled={isTogglePending || !onToggle}
            className="ml-2 disabled:cursor-default disabled:opacity-100"
          />
        </div>
      </div>
    );
  }

  return (
    <Card
      className="plugin-card-hover group relative flex h-[388px] flex-col overflow-hidden hover:border-primary/50 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-1 w-full bg-green-500 transition-[opacity,transform] duration-300 ease-out',
          displayEnabled ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        )}
      />

      {(isNew || updateInfo) && (
        <div className="absolute left-0 top-0 z-10 flex flex-col items-start gap-1">
          {isNew && (
            <Badge className="rounded-none rounded-br-md border-0 bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-0.5 text-[10px] text-white shadow-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              {t('badges.new', { defaultValue: 'Новое' })}
            </Badge>
          )}
          {updateInfo && (
            <Badge className="rounded-none rounded-br-md border-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-0.5 text-[10px] text-white shadow-sm">
              <ArrowUpCircle className="mr-1 h-3 w-3" />
              {t('badges.update', { defaultValue: 'Обновление' })}
            </Badge>
          )}
        </div>
      )}

      <CardHeader className="pb-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative shrink-0">
              <IconComponent
                name={plugin.manifest?.icon}
                className={cn(
                  'h-10 w-10 transform-gpu transition-transform duration-300 ease-out group-hover:scale-105',
                  displayEnabled ? 'text-primary' : 'text-muted-foreground',
                  isHovered && 'drop-shadow-glow'
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={`/bots/${botId}/plugins/view/${plugin.name}`} className="block">
                    <CardTitle className="line-clamp-2 cursor-pointer text-lg leading-tight transition-colors hover:text-primary">
                      {plugin.displayName || plugin.name}
                    </CardTitle>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="text-muted-foreground">{t('labels.pluginId', { defaultValue: 'ID плагина:' })}</div>
                    <div className="font-mono">{plugin.name}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
              <CardDescription className="truncate text-sm">
                {t('labels.by', { defaultValue: 'от' })} {authorLabel}
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
                    className="mr-1 h-8 w-8 rounded-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                    onClick={() => onUpdate.handle(plugin.id)}
                    disabled={isUpdatingThisPlugin}
                  >
                    {isUpdatingThisPlugin ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{renderUpdateTooltip()}</TooltipContent>
              </Tooltip>
            )}
            <Switch checked={displayEnabled} onCheckedChange={handleToggleChange} disabled={isTogglePending || !onToggle} className="shrink-0 disabled:cursor-default disabled:opacity-100" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-2">
        <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>

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
          <div className="space-y-2 border-t border-border/50 pt-2">
            {plugin.commands?.length > 0 && (
              <div className="flex items-center gap-2">
                <Terminal className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  {t('labels.commandsCount', { count: plugin.commands.length, defaultValue: 'Команды: {{count}}' })}
                </span>
                <div className="flex flex-wrap gap-1">
                  {plugin.commands.slice(0, 2).map((command) => (
                    <Badge key={command.id} variant="outline" className="text-xs">
                      {command.name}
                    </Badge>
                  ))}
                  {plugin.commands.length > 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-pointer text-xs hover:bg-muted">+{plugin.commands.length - 2}</Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {plugin.commands.slice(2).map((command) => (
                            <Badge key={command.id} variant="secondary" className="text-xs">
                              {command.name}
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
                  {t('labels.eventGraphsCount', { count: plugin.eventGraphs.length, defaultValue: 'Графы событий: {{count}}' })}
                </span>
                <div className="flex flex-wrap gap-1">
                  {plugin.eventGraphs.slice(0, 2).map((graph) => (
                    <Badge key={graph.id} variant="outline" className="text-xs">
                      {graph.name}
                    </Badge>
                  ))}
                  {plugin.eventGraphs.length > 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-pointer text-xs hover:bg-muted">+{plugin.eventGraphs.length - 2}</Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {plugin.eventGraphs.slice(2).map((graph) => (
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lastUpdated}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto items-center justify-between gap-4 border-t px-5 py-4">
        {updateInfo && onUpdate && (
          <Button className="h-9 w-[190px] min-w-0 shrink-0 justify-center text-sm" size="sm" onClick={() => onUpdate.handle(plugin.id)} disabled={isUpdatingThisPlugin}>
            {isUpdatingThisPlugin ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('installed.updateInProgress', { defaultValue: 'Обновление...' })}
              </>
            ) : (
              <>
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                {updateVersion
                  ? t('installed.updateButtonTo', { version: updateVersion, defaultValue: 'Обновить до v{{version}}' })
                  : t('installed.updateButton', { defaultValue: 'Обновить' })}
              </>
            )}
          </Button>
        )}

        <div className={cn('flex items-center gap-2', hasUpdateAction ? 'shrink-0 justify-end' : 'w-full')}>
          {renderActions()}
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
  onReloadPlugin,
}) {
  const { t } = useTranslation('plugins');
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('installed-plugins-view-mode') || 'grid');
  const [pluginToDelete, setPluginToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const updatesFilterContentRef = useRef(null);
  const [updatesFilterWidth, setUpdatesFilterWidth] = useState(0);
  const [skipUpdatesIntroAnimation, setSkipUpdatesIntroAnimation] = useState(true);

  const stats = useMemo(() => {
    const enabled = installedPlugins.filter((plugin) => plugin.isEnabled).length;
    const local = installedPlugins.filter((plugin) => plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE').length;
    const github = installedPlugins.filter((plugin) => plugin.sourceType === 'GITHUB').length;

    return {
      total: installedPlugins.length,
      enabled,
      disabled: installedPlugins.length - enabled,
      updates: Object.keys(updates).length,
      local,
      github,
    };
  }, [installedPlugins, updates]);

  const sortedAndFilteredPlugins = useMemo(() => {
    const sorted = [...installedPlugins].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const byFilter = (() => {
      switch (filter) {
        case 'enabled':
          return sorted.filter((plugin) => plugin.isEnabled);
        case 'disabled':
          return sorted.filter((plugin) => !plugin.isEnabled);
        case 'updates':
          return sorted.filter((plugin) => updates[plugin.id]);
        case 'local':
          return sorted.filter((plugin) => plugin.sourceType === 'LOCAL' || plugin.sourceType === 'LOCAL_IDE');
        case 'github':
          return sorted.filter((plugin) => plugin.sourceType === 'GITHUB');
        default:
          return sorted;
      }
    })();

    if (!searchQuery) return byFilter;
    const query = searchQuery.toLowerCase();
    return byFilter.filter((plugin) => (
      (plugin.displayName || plugin.name)?.toLowerCase().includes(query) ||
      plugin.description?.toLowerCase().includes(query) ||
      plugin.author?.toLowerCase().includes(query)
    ));
  }, [installedPlugins, filter, updates, searchQuery]);

  useEffect(() => {
    localStorage.setItem('installed-plugins-view-mode', viewMode);
  }, [viewMode]);

  React.useLayoutEffect(() => {
    if (!updatesFilterContentRef.current) return;
    setUpdatesFilterWidth(updatesFilterContentRef.current.scrollWidth);
  }, [stats.updates, t]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSkipUpdatesIntroAnimation(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const baseFilterButtonClassName =
    'tabular-nums whitespace-nowrap transition-[background-color,color,border-color,box-shadow,opacity] duration-200 ease-out';

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b bg-background/30 px-6 py-3">
          <motion.div layout transition={FILTER_LAYOUT_TRANSITION} className="flex flex-wrap items-center gap-2">
            <motion.div layout transition={FILTER_LAYOUT_TRANSITION}>
            <Button size="sm" onClick={() => setFilter('all')} variant={filter === 'all' ? 'default' : 'ghost'} className={baseFilterButtonClassName}>
              {t('installed.filters.all', { count: stats.total, defaultValue: 'Все ({{count}})' })}
            </Button>
            </motion.div>
            <motion.div layout transition={FILTER_LAYOUT_TRANSITION} className="h-4 w-px bg-border" />
            <motion.div layout transition={FILTER_LAYOUT_TRANSITION}>
            <Button size="sm" onClick={() => setFilter('enabled')} variant={filter === 'enabled' ? 'default' : 'ghost'} className={baseFilterButtonClassName}>
              <Power className="mr-1.5 h-3.5 w-3.5" />
              {t('installed.filters.enabled', { count: stats.enabled, defaultValue: 'Активно ({{count}})' })}
            </Button>
            </motion.div>
            <motion.div layout transition={FILTER_LAYOUT_TRANSITION}>
            <Button size="sm" onClick={() => setFilter('disabled')} variant={filter === 'disabled' ? 'default' : 'ghost'} className={baseFilterButtonClassName}>
              <PowerOff className="mr-1.5 h-3.5 w-3.5" />
              {t('installed.filters.disabled', { count: stats.disabled, defaultValue: 'Выкл ({{count}})' })}
            </Button>
            </motion.div>
            <motion.div
              layout
              initial={false}
              transition={{
                layout: FILTER_LAYOUT_TRANSITION,
                width: skipUpdatesIntroAnimation ? { duration: 0 } : FILTER_FADE_TRANSITION,
                opacity: skipUpdatesIntroAnimation ? { duration: 0 } : FILTER_FADE_TRANSITION,
              }}
              animate={{
                width: stats.updates > 0 ? updatesFilterWidth : 0,
                opacity: stats.updates > 0 ? 1 : 0,
              }}
              className="flex overflow-hidden whitespace-nowrap"
              style={{ originX: 0 }}
            >
              <motion.div
                ref={updatesFilterContentRef}
                layout
                transition={{
                  layout: FILTER_LAYOUT_TRANSITION,
                  opacity: skipUpdatesIntroAnimation ? { duration: 0 } : FILTER_FADE_TRANSITION,
                  scale: skipUpdatesIntroAnimation ? { duration: 0 } : FILTER_FADE_TRANSITION,
                }}
                animate={{ opacity: stats.updates > 0 ? 1 : 0, scale: stats.updates > 0 ? 1 : 0.98 }}
                className="flex shrink-0 items-center gap-2"
              >
                <motion.div
                  layout
                  transition={{
                    layout: FILTER_LAYOUT_TRANSITION,
                    opacity: skipUpdatesIntroAnimation ? { duration: 0 } : FILTER_FADE_TRANSITION,
                    scaleX: skipUpdatesIntroAnimation ? { duration: 0 } : FILTER_FADE_TRANSITION,
                  }}
                  animate={{ opacity: stats.updates > 0 ? 1 : 0, scaleX: stats.updates > 0 ? 1 : 0.7 }}
                  className="h-4 w-px shrink-0 origin-center bg-border"
                />
                <Button
                  variant={filter === 'updates' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('updates')}
                  disabled={stats.updates === 0}
                  tabIndex={stats.updates > 0 ? 0 : -1}
                  aria-hidden={stats.updates === 0}
                  className={cn(
                    stats.updates > 0 && filter !== 'updates' && 'text-blue-500',
                    baseFilterButtonClassName,
                    stats.updates === 0 && 'pointer-events-none'
                  )}
                >
                  <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5" />
                  {t('installed.filters.updates', { count: stats.updates, defaultValue: 'Обновления ({{count}})' })}
                </Button>
              </motion.div>
              </motion.div>
            <motion.div layout transition={FILTER_LAYOUT_TRANSITION} className="h-4 w-px bg-border" />
            <motion.div layout transition={FILTER_LAYOUT_TRANSITION}>
            <Button size="sm" onClick={() => setFilter('local')} variant={filter === 'local' ? 'default' : 'ghost'} className={baseFilterButtonClassName}>
              <Code className="mr-1.5 h-3.5 w-3.5" />
              {t('installed.filters.local', { count: stats.local, defaultValue: 'Локальные ({{count}})' })}
            </Button>
            </motion.div>
            <motion.div layout transition={FILTER_LAYOUT_TRANSITION}>
            <Button size="sm" onClick={() => setFilter('github')} variant={filter === 'github' ? 'default' : 'ghost'} className={baseFilterButtonClassName}>
              <GitBranch className="mr-1.5 h-3.5 w-3.5" />
              {t('installed.filters.github', { count: stats.github, defaultValue: 'GitHub ({{count}})' })}
            </Button>
            </motion.div>
          </motion.div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Icons.Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('installed.searchPlaceholder', { defaultValue: 'Поиск...' })}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="h-8">
                <TabsTrigger value="grid" className="h-7 px-2" aria-label={t('browser.viewGrid', { defaultValue: 'Сетка' })}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="list" className="h-7 px-2" aria-label={t('browser.viewList', { defaultValue: 'Список' })}>
                  <List className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FadeTransition transitionKey={`${viewMode}-${filter}`} className="h-full" duration={0.2}>
          {sortedAndFilteredPlugins.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedAndFilteredPlugins.map((plugin) => (
                  <InstalledPluginCard
                    key={plugin.id}
                    plugin={plugin}
                    botId={bot.id}
                    updateInfo={updates[plugin.id]}
                    onToggle={onTogglePlugin}
                    onDelete={() => setPluginToDelete(plugin)}
                    onUpdate={{ handle: onUpdatePlugin, isUpdating }}
                    onOpenSettings={setSelectedPlugin}
                    onFork={onForkPlugin}
                    onReload={onReloadPlugin}
                    viewMode="grid"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3 px-4 py-3">
                {sortedAndFilteredPlugins.map((plugin) => (
                  <InstalledPluginCard
                    key={plugin.id}
                    plugin={plugin}
                    botId={bot.id}
                    updateInfo={updates[plugin.id]}
                    onToggle={onTogglePlugin}
                    onDelete={() => setPluginToDelete(plugin)}
                    onUpdate={{ handle: onUpdatePlugin, isUpdating }}
                    onOpenSettings={setSelectedPlugin}
                    onFork={onForkPlugin}
                    onReload={onReloadPlugin}
                    viewMode="list"
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-10 text-center">
              <Package className="mb-4 h-16 w-16 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold text-muted-foreground">
                {t('installed.emptyTitle', { defaultValue: 'Нет плагинов' })}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {filter === 'all'
                  ? t('installed.emptyAll', { defaultValue: 'У вас пока нет установленных плагинов' })
                  : t('installed.emptyFiltered', { defaultValue: 'Нет плагинов, соответствующих выбранному фильтру' })}
              </p>
              {filter !== 'all' && (
                <Button variant="outline" className="mt-4" onClick={() => setFilter('all')}>
                  {t('installed.showAll', { defaultValue: 'Показать все плагины' })}
                </Button>
              )}
            </div>
          )}
          </FadeTransition>
        </div>
      </div>

      <Dialog open={!!selectedPlugin} onOpenChange={(isOpen) => !isOpen && setSelectedPlugin(null)}>
        {selectedPlugin && (
          <PluginSettingsDialog
            bot={bot}
            plugin={selectedPlugin}
            onOpenChange={(isOpen) => !isOpen && setSelectedPlugin(null)}
            onSaveSuccess={onSaveSettings}
            readOnly={!onUpdatePlugin}
          />
        )}
      </Dialog>

      {pluginToDelete && (
        <ConfirmationDialog
          open={!!pluginToDelete}
          onOpenChange={() => setPluginToDelete(null)}
          title={t('installed.confirmDeleteTitle', { name: pluginToDelete.name, defaultValue: 'Удалить плагин "{{name}}"?' })}
          description={t('installed.confirmDeleteDescription', { defaultValue: 'Это действие необратимо. Все файлы и настройки плагина будут удалены для этого бота.' })}
          onConfirm={() => onDeletePlugin(pluginToDelete)}
          confirmText={t('installed.confirmDeleteAction', { defaultValue: 'Да, удалить плагин' })}
        />
      )}
    </TooltipProvider>
  );
}
