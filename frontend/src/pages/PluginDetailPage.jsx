import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';
import PluginSettingsDialog from '@/components/PluginSettingsDialog';
import { Dialog } from '@/components/ui/dialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import GitHubReadmeContent from '@/components/GitHubReadmeContent';
import { cn } from '@/lib/utils';
import { translatePluginCategory } from '@/utils/pluginPresentation';
import {
  Activity,
  ArrowLeft,
  Clock,
  Download,
  FileText,
  GitBranch,
  Github,
  Loader2,
  Package,
  Power,
  Server,
  Settings,
  Shield,
  Terminal,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import * as Icons from 'lucide-react';

const IconComponent = ({ name, ...props }) => {
  if (!name) return <Package {...props} />;
  if (name.startsWith('/') || name.startsWith('http')) return <img src={name} alt="plugin icon" {...props} />;

  const iconName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const LucideIcon = Icons[iconName] || Package;
  return <LucideIcon {...props} />;
};

const getSafeExternalUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const getGithubAuthorFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    if (!['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase())) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    return parts[0];
  } catch {
    return null;
  }
};

export default function PluginDetailPage() {
  const { t } = useTranslation(['plugin-detail', 'plugins']);
  const { pluginName, botId } = useParams();
  const intBotId = parseInt(botId, 10);
  const navigate = useNavigate();
  const { toast } = useToast();

  const allInstalledPlugins = useAppStore((state) => state.installedPlugins);
  const pluginCatalog = useAppStore((state) => state.pluginCatalog);
  const installPluginFromRepo = useAppStore((state) => state.installPluginFromRepo);
  const fetchInstalledPlugins = useAppStore((state) => state.fetchInstalledPlugins);
  const forkPlugin = useAppStore((state) => state.forkPlugin);
  const togglePlugin = useAppStore((state) => state.togglePlugin);
  const deletePlugin = useAppStore((state) => state.deletePlugin);

  const installedPluginsForBot = useMemo(() => allInstalledPlugins[intBotId] || [], [allInstalledPlugins, intBotId]);
  const cachedCatalogPlugin = useMemo(
    () => pluginCatalog.find((plugin) => plugin.name === pluginName) || null,
    [pluginCatalog, pluginName]
  );

  const [plugin, setPlugin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [changelog, setChangelog] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [pluginToDelete, setPluginToDelete] = useState(null);
  const [localEnabled, setLocalEnabled] = useState(false);
  const [isTogglePending, setIsTogglePending] = useState(false);

  const safeRepoUrl = useMemo(() => getSafeExternalUrl(plugin?.repoUrl), [plugin?.repoUrl]);
  const authorLabel = useMemo(
    () =>
      plugin?.author ||
      getGithubAuthorFromUrl(plugin?.repoUrl) ||
      t('plugins:labels.unknownAuthor', { defaultValue: 'Неизвестный автор' }),
    [plugin?.author, plugin?.repoUrl, t]
  );
  const pluginDescription = plugin?.description || t('plugins:labels.noDescription', { defaultValue: 'Нет описания.' });

  const [stats] = useState({
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchPluginDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/plugins/catalog/${encodeURIComponent(pluginName)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(t('notFound.title'));
        const data = await response.json();
        if (controller.signal.aborted) return;
        setPlugin(data);
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError') {
          return;
        }
        toast({ variant: 'destructive', title: t('messages.error'), description: error.message });
      } finally {
        if (controller.signal.aborted) {
          return;
        }
        setIsLoading(false);
      }
    };

    const hasCachedPluginDetails = Boolean(
      cachedCatalogPlugin?.readmeHtml || cachedCatalogPlugin?.fullDescription || cachedCatalogPlugin?.readme
    );

    if (cachedCatalogPlugin) {
      setPlugin((current) =>
        current && current.name === cachedCatalogPlugin.name ? { ...cachedCatalogPlugin, ...current } : cachedCatalogPlugin
      );
      setIsLoading(false);
    }

    if (!hasCachedPluginDetails) {
      fetchPluginDetails();
    }

    return () => {
      controller.abort();
    };
  }, [cachedCatalogPlugin, pluginName, t, toast]);

  useEffect(() => {
    setChangelog('');
  }, [pluginName]);

  useEffect(() => {
    if (activeTab !== 'changelog' || changelog || !pluginName) {
      return undefined;
    }

    const controller = new AbortController();

    const fetchChangelog = async () => {
      try {
        const response = await fetch(`/api/plugins/catalog/${encodeURIComponent(pluginName)}/changelog`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (controller.signal.aborted) {
          return;
        }

        setChangelog(data?.body || '');
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError') {
          return;
        }
        console.warn('Failed to load GitHub changelog:', error.message);
      }
    };

    fetchChangelog();

    return () => {
      controller.abort();
    };
  }, [activeTab, changelog, pluginName]);

  useEffect(() => {
    if (botId && !allInstalledPlugins[intBotId]) {
      fetchInstalledPlugins(intBotId);
    }
  }, [allInstalledPlugins, botId, fetchInstalledPlugins, intBotId]);

  const installedPlugin = useMemo(() => {
    if (!plugin) return null;
    return installedPluginsForBot.find((item) => item.sourceUri === safeRepoUrl || item.name === plugin.name);
  }, [installedPluginsForBot, plugin, safeRepoUrl]);

  useEffect(() => {
    setLocalEnabled(Boolean(installedPlugin?.isEnabled));
  }, [installedPlugin?.id, installedPlugin?.isEnabled]);

  const handleInstall = async () => {
    if (!plugin || !safeRepoUrl) return;

    setIsInstalling(true);
    try {
      await installPluginFromRepo(intBotId, safeRepoUrl, plugin.name);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleFork = async () => {
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

  const handleTogglePlugin = async (checked) => {
    if (!installedPlugin || isTogglePending) return;

    const previousEnabled = localEnabled;
    setLocalEnabled(checked);
    setIsTogglePending(true);
    try {
      await togglePlugin(intBotId, installedPlugin.id, checked);
    } catch {
      setLocalEnabled(previousEnabled);
    } finally {
      setIsTogglePending(false);
    }
  };

  const handleDeletePlugin = async () => {
    if (!installedPlugin) return;
    await deletePlugin(intBotId, installedPlugin.id, installedPlugin.name);
    setPluginToDelete(null);
    navigate(`/bots/${intBotId}/plugins`);
  };

  const formatDate = (date) => {
    const days = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return t('dates.today');
    if (days === 1) return t('dates.yesterday');
    if (days < 7) return t('dates.daysAgo', { count: days });
    if (days < 30) return t('dates.weeksAgo', { count: Math.floor(days / 7) });
    return t('dates.monthsAgo', { count: Math.floor(days / 30) });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">{t('notFound.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('notFound.description')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('notFound.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative border-b bg-muted/30 p-8">
        <div className="relative mx-auto max-w-6xl">
          <Link
            to={`/bots/${botId}/plugins`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToStore')}
          </Link>

          <div className="flex flex-col items-start gap-6 md:flex-row">
            <div className="flex-grow">
              <div className="mb-2 flex items-center gap-4">
                <IconComponent name={plugin.icon} className="h-12 w-12 shrink-0 text-primary" />
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight">{plugin.displayName || plugin.name}</h1>
                  {plugin.verified && <Shield className="h-6 w-6 text-blue-500" />}
                  {installedPlugin && (
                    <Badge variant={installedPlugin.isEnabled ? 'default' : 'secondary'} className="text-sm">
                      <Power className="mr-1 h-3 w-3" />
                      {installedPlugin.isEnabled
                        ? t('status.enabled', { defaultValue: 'Активен' })
                        : t('status.disabled', { defaultValue: 'Выключен' })}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {t('by')} {authorLabel}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span>v{(plugin.latestTag || '0.0.0').replace(/^v/i, '')}</span>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {(plugin.categories || []).map((category) => (
                  <Badge key={category} variant="secondary" className="text-sm">
                    {translatePluginCategory(category, t)}
                  </Badge>
                ))}
              </div>

              <p className="max-w-2xl text-lg text-muted-foreground">{pluginDescription}</p>
            </div>

            <div className="flex min-w-[240px] flex-col gap-3">
              {installedPlugin ? (
                <Card className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-medium">{t('status.title', { defaultValue: 'Статус плагина' })}</span>
                    <Switch checked={localEnabled} onCheckedChange={handleTogglePlugin} disabled={isTogglePending} />
                  </div>
                  <div className="space-y-2">
                    {installedPlugin.manifest?.settings && Object.keys(installedPlugin.manifest.settings).length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedPlugin(installedPlugin)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {t('buttons.settings', { defaultValue: 'Настройки' })}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => setPluginToDelete(installedPlugin)}
                      disabled={installedPlugin.isEnabled}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('buttons.delete', { defaultValue: 'Удалить' })}
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button size="lg" className="w-full" disabled={isInstalling} onClick={handleInstall}>
                  {isInstalling ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('buttons.installing')}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      {t('buttons.install')}
                    </>
                  )}
                </Button>
              )}

              <div className="flex gap-2">
                {safeRepoUrl && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={safeRepoUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </a>
                  </Button>
                )}
                {installedPlugin && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleFork} disabled={isForking}>
                    {isForking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="mr-2 h-4 w-4" />
                    )}
                    {t('buttons.fork')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="p-4 text-center">
            <TrendingUp className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="text-2xl font-bold">{plugin.downloads || 0}</p>
            <p className="text-sm text-muted-foreground">{t('stats.totalDownloads')}</p>
          </Card>
          <Card className="p-4 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-blue-500" />
            <p className="text-2xl font-bold">{formatDate(stats.lastUpdated)}</p>
            <p className="text-sm text-muted-foreground">{t('stats.updated')}</p>
          </Card>
          {installedPlugin && (
            <>
              <Card className="p-4 text-center">
                <Terminal className="mx-auto mb-2 h-8 w-8 text-green-500" />
                <p className="text-2xl font-bold">{installedPlugin.commands?.length || 0}</p>
                <p className="text-sm text-muted-foreground">{t('stats.commands', { defaultValue: 'Команд' })}</p>
              </Card>
              <Card className="p-4 text-center">
                <Activity className="mx-auto mb-2 h-8 w-8 text-purple-500" />
                <p className="text-2xl font-bold">{installedPlugin.eventGraphs?.length || 0}</p>
                <p className="text-sm text-muted-foreground">{t('stats.events', { defaultValue: 'Событий' })}</p>
              </Card>
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn('grid w-full', installedPlugin ? 'grid-cols-3' : 'grid-cols-2')}>
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="changelog">{t('tabs.changelog')}</TabsTrigger>
            {installedPlugin && installedPlugin.commands?.length > 0 && (
              <TabsTrigger value="commands">{t('tabs.commands', { defaultValue: 'Команды' })}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{plugin.readmeHtml ? 'README' : t('overview.description')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GitHubReadmeContent
                      html={plugin.readmeHtml}
                      fallback={
                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown>{plugin.fullDescription || plugin.description || t('overview.noDescription')}</ReactMarkdown>
                        </div>
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('overview.info')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('overview.version')}</span>
                      <span>{plugin.latestTag}</span>
                    </div>
                  </CardContent>
                </Card>

                {plugin.supportedHosts && plugin.supportedHosts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        {t('overview.supportedServers', { defaultValue: 'Поддерживаемые серверы' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plugin.supportedHosts.map((host) => (
                          <li key={host} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="font-mono text-xs">{host}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {plugin.dependencies && plugin.dependencies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        {t('overview.dependencies')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plugin.dependencies.map((dependency) => (
                          <li key={dependency} className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {dependency}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="changelog" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('changelog.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {changelog ? (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{changelog}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>{t('changelog.empty.title')}</p>
                    <p className="mt-2 text-sm">{t('changelog.empty.description')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {installedPlugin && installedPlugin.commands?.length > 0 && (
            <TabsContent value="commands" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    {t('sections.pluginCommands', { defaultValue: 'Команды плагина' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {installedPlugin.commands.map((command) => (
                      <div key={command.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {command.name}
                          </Badge>
                          {command.permission && (
                            <Badge variant="secondary" className="text-xs">
                              {command.permission}
                            </Badge>
                          )}
                        </div>
                        {command.description && <p className="text-sm text-muted-foreground">{command.description}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {installedPlugin.eventGraphs?.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      {t('sections.eventGraphs', { defaultValue: 'Графы событий' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {installedPlugin.eventGraphs.map((graph) => (
                        <div key={graph.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline">{graph.name}</Badge>
                            {graph.eventType && (
                              <Badge variant="secondary" className="text-xs">
                                {graph.eventType}
                              </Badge>
                            )}
                          </div>
                          {graph.description && <p className="text-sm text-muted-foreground">{graph.description}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={!!selectedPlugin} onOpenChange={(isOpen) => !isOpen && setSelectedPlugin(null)}>
        {selectedPlugin && (
          <PluginSettingsDialog
            bot={{ id: intBotId }}
            plugin={selectedPlugin}
            onOpenChange={(isOpen) => !isOpen && setSelectedPlugin(null)}
            onSaveSuccess={() => fetchInstalledPlugins(intBotId)}
            readOnly={false}
          />
        )}
      </Dialog>

      {pluginToDelete && (
        <ConfirmationDialog
          open={!!pluginToDelete}
          onOpenChange={() => setPluginToDelete(null)}
          title={t('deleteDialog.title', {
            name: pluginToDelete.displayName || pluginToDelete.name,
            defaultValue: 'Удалить плагин "{{name}}"?',
          })}
          description={t('deleteDialog.description', {
            defaultValue: 'Это действие необратимо. Все файлы и настройки плагина будут удалены для этого бота.',
          })}
          onConfirm={handleDeletePlugin}
          confirmText={t('deleteDialog.confirm', { defaultValue: 'Да, удалить плагин' })}
        />
      )}
    </div>
  );
}
