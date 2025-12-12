import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Download, CheckCircle, Loader2, Github, ArrowLeft, Star, Users, Clock, GitBranch, Package, Shield, TrendingUp, Code2, FileText, ExternalLink, Heart, Share2, Sparkles, Settings, Trash2, Terminal, Activity, Power, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import PluginSettingsDialog from '@/components/PluginSettingsDialog';
import { Dialog } from "@/components/ui/dialog";
import ConfirmationDialog from '@/components/ConfirmationDialog';

const IconComponent = ({ name, ...props }) => {
    if (!name) return <Package {...props} />;
    if (name.startsWith('/') || name.startsWith('http')) return <img src={name} alt="plugin icon" {...props} />;
    const iconName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const LucideIcon = Icons[iconName] || Package;
    return <LucideIcon {...props} />;
};

export default function PluginDetailPage() {
    const { t } = useTranslation('plugin-detail');
    const { pluginName, botId } = useParams();
    const intBotId = parseInt(botId, 10);
    const navigate = useNavigate();

    const allInstalledPlugins = useAppStore(state => state.installedPlugins);
    const installPluginFromRepo = useAppStore(state => state.installPluginFromRepo);
    const fetchInstalledPlugins = useAppStore(state => state.fetchInstalledPlugins);
    const forkPlugin = useAppStore(state => state.forkPlugin);
    const togglePlugin = useAppStore(state => state.togglePlugin);
    const deletePlugin = useAppStore(state => state.deletePlugin);

    const installedPluginsForBot = useMemo(() => allInstalledPlugins[intBotId] || [], [allInstalledPlugins, intBotId]);

    const [plugin, setPlugin] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isForking, setIsForking] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [changelog, setChangelog] = useState('');
    const [readme, setReadme] = useState('');
    const [selectedPlugin, setSelectedPlugin] = useState(null);
    const [pluginToDelete, setPluginToDelete] = useState(null);
    const { toast } = useToast();

    const [stats] = useState({
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    });

    useEffect(() => {
        const fetchPluginDetails = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/plugins/catalog/${pluginName}`);
                if (!response.ok) throw new Error(t('notFound.title'));
                const data = await response.json();
                
                try {
                    const statsResponse = await fetch('http://185.65.200.184:3000/api/stats');
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        const pluginStats = statsData?.plugins?.find(p => p.pluginName === data.name);
                        if (pluginStats) {
                            data.downloads = pluginStats.downloadCount;
                        }
                    }
                } catch (statsError) {
                    console.warn('Failed to load stats:', statsError.message);
                }
                
                setPlugin(data);
                
                try {
                    const urlParts = new URL(data.repoUrl);
                    const pathParts = urlParts.pathname.split('/').filter(p => p);

                    if (pathParts.length >= 2) {
                        const owner = pathParts[0];
                        const repo = pathParts[1].replace('.git', '');

                        // Load changelog
                        const releasesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
                        if (releasesResponse.ok) {
                            const releaseData = await releasesResponse.json();
                            if (releaseData.body) {
                                setChangelog(releaseData.body);
                            }
                        }

                        // Load README
                        const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
                            headers: { 'Accept': 'application/vnd.github.v3.raw' }
                        });
                        if (readmeResponse.ok) {
                            const readmeText = await readmeResponse.text();
                            setReadme(readmeText);
                        }
                    }
                } catch (releaseError) {
                    console.warn('Failed to load GitHub data:', releaseError.message);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: t('messages.error'), description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchPluginDetails();
    }, [pluginName, toast]);
    
    useEffect(() => {
        if (botId) {
            fetchInstalledPlugins(intBotId);
        }
    }, [botId, fetchInstalledPlugins, intBotId]);

    const installedPlugin = useMemo(() => {
        if (!plugin) return null;
        return installedPluginsForBot.find(p =>
            p.sourceUri === plugin.repoUrl || p.name === plugin.name
        );
    }, [installedPluginsForBot, plugin]);

    const isInstalled = useMemo(() => {
        return !!installedPlugin;
    }, [installedPlugin]);

    const handleInstall = async () => {
        if (!plugin) return;
        setIsInstalling(true);
        try {
            await installPluginFromRepo(intBotId, plugin.repoUrl, plugin.name);
        } catch (error) {
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
        if (!installedPlugin) return;
        await togglePlugin(intBotId, installedPlugin.id, checked);
        await fetchInstalledPlugins(intBotId);
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
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!plugin) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-destructive">{t('notFound.title')}</h2>
                <p className="text-muted-foreground mt-2">{t('notFound.description')}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('notFound.back')}
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="relative bg-muted/30 p-8 border-b">
                <div className="relative max-w-6xl mx-auto">
                    <Link to={`/bots/${botId}/plugins`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        {t('backToStore')}
                    </Link>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-grow">
                            <div className="flex items-center gap-4 mb-2">
                                <IconComponent
                                    name={plugin.icon}
                                    className="h-12 w-12 text-primary shrink-0"
                                />
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-4xl font-bold tracking-tight">{plugin.displayName || plugin.name}</h1>
                                    {plugin.verified && (
                                        <Shield className="h-6 w-6 text-blue-500" />
                                    )}
                                    {installedPlugin && (
                                        <Badge variant={installedPlugin.isEnabled ? "default" : "secondary"} className="text-sm">
                                            <Power className="h-3 w-3 mr-1" />
                                            {installedPlugin.isEnabled ? 'Активен' : 'Выключен'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <span>{t('by')} {plugin.author}</span>
                                <Separator orientation="vertical" className="h-4" />
                                <span>v{plugin.latestTag.replace('v','')}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-6">
                                {(plugin.categories || []).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-sm">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                {plugin.description}
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-3 min-w-[240px]">
                            {installedPlugin ? (
                                <>
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-medium">Статус плагина</span>
                                            <Switch
                                                checked={installedPlugin.isEnabled}
                                                onCheckedChange={handleTogglePlugin}
                                            />
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
                                                    Настройки
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
                                                Удалить
                                            </Button>
                                        </div>
                                    </Card>
                                </>
                            ) : (
                                <Button
                                    size="lg"
                                    className="w-full"
                                    disabled={isInstalling}
                                    onClick={handleInstall}
                                >
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
                                <Button variant="outline" size="sm" className="flex-1" asChild>
                                    <a href={plugin.repoUrl} target="_blank" rel="noopener noreferrer">
                                        <Github className="mr-2 h-4 w-4" />
                                        GitHub
                                    </a>
                                </Button>
                                {installedPlugin && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={handleFork}
                                        disabled={isForking}
                                    >
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

            <div className="max-w-6xl mx-auto p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="text-center p-4">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold">{plugin.downloads || 0}</p>
                        <p className="text-sm text-muted-foreground">{t('stats.totalDownloads')}</p>
                    </Card>
                    <Card className="text-center p-4">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{formatDate(stats.lastUpdated)}</p>
                        <p className="text-sm text-muted-foreground">{t('stats.updated')}</p>
                    </Card>
                    {installedPlugin && (
                        <>
                            <Card className="text-center p-4">
                                <Terminal className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                <p className="text-2xl font-bold">{installedPlugin.commands?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Команд</p>
                            </Card>
                            <Card className="text-center p-4">
                                <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                                <p className="text-2xl font-bold">{installedPlugin.eventGraphs?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Событий</p>
                            </Card>
                        </>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={cn("grid w-full", installedPlugin ? "grid-cols-3" : "grid-cols-2")}>
                        <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
                        <TabsTrigger value="changelog">{t('tabs.changelog')}</TabsTrigger>
                        {installedPlugin && installedPlugin.commands?.length > 0 && (
                            <TabsTrigger value="commands">Команды</TabsTrigger>
                        )}
                    </TabsList>
                    
                    <TabsContent value="overview" className="mt-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{readme ? 'README' : t('overview.description')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose prose-invert max-w-none">
                                            <ReactMarkdown>
                                                {readme || plugin.fullDescription || plugin.description || t('overview.noDescription')}
                                            </ReactMarkdown>
                                        </div>
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
                                                Поддерживаемые серверы
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2 text-sm">
                                                {plugin.supportedHosts.map((host) => (
                                                    <li key={host} className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
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
                                                {plugin.dependencies.map((dep) => (
                                                    <li key={dep} className="flex items-center gap-2">
                                                        <Package className="h-4 w-4 text-muted-foreground" />
                                                        {dep}
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
                                        <ReactMarkdown>
                                            {changelog}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>{t('changelog.empty.title')}</p>
                                        <p className="text-sm mt-2">
                                            {t('changelog.empty.description')}
                                        </p>
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
                                        Команды плагина
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {installedPlugin.commands.map((cmd) => (
                                            <div key={cmd.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="font-mono">
                                                        {cmd.name}
                                                    </Badge>
                                                    {cmd.permission && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {cmd.permission}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {cmd.description && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {cmd.description}
                                                    </p>
                                                )}
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
                                            Графы событий
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {installedPlugin.eventGraphs.map((graph) => (
                                                <div key={graph.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline">
                                                            {graph.name}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {graph.eventType}
                                                        </Badge>
                                                    </div>
                                                    {graph.description && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {graph.description}
                                                        </p>
                                                    )}
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
                    title={`Удалить плагин "${pluginToDelete.displayName || pluginToDelete.name}"?`}
                    description="Это действие необратимо. Все файлы и настройки плагина будут удалены для этого бота."
                    onConfirm={handleDeletePlugin}
                    confirmText="Да, удалить плагин"
                />
            )}
        </div>
    );
}
