import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, CheckCircle, Loader2, Github, ArrowLeft, Star, Users, Clock, GitBranch, Package, Shield, TrendingUp, Code2, FileText, ExternalLink, Heart, Share2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

export default function PluginDetailPage() {
    const { pluginName, botId } = useParams();
    const intBotId = parseInt(botId, 10);
    const navigate = useNavigate();
    
    const allInstalledPlugins = useAppStore(state => state.installedPlugins);
    const installPluginFromRepo = useAppStore(state => state.installPluginFromRepo);
    const fetchInstalledPlugins = useAppStore(state => state.fetchInstalledPlugins);
    const forkPlugin = useAppStore(state => state.forkPlugin);

    const installedPluginsForBot = useMemo(() => allInstalledPlugins[intBotId] || [], [allInstalledPlugins, intBotId]);

    const [plugin, setPlugin] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isForking, setIsForking] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [changelog, setChangelog] = useState('');
    const { toast } = useToast();

    const [stats] = useState({
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    });

    useEffect(() => {
        const fetchPluginDetails = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/plugins/catalog/${pluginName}`);
                if (!response.ok) throw new Error('Плагин не найден');
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
                    console.warn('Не удалось загрузить статистику:', statsError.message);
                }
                
                setPlugin(data);
                
                try {
                    const urlParts = new URL(data.repoUrl);
                    const pathParts = urlParts.pathname.split('/').filter(p => p);
                    
                    if (pathParts.length >= 2) {
                        const owner = pathParts[0];
                        const repo = pathParts[1].replace('.git', '');
                        
                        const releasesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
                        if (releasesResponse.ok) {
                            const releaseData = await releasesResponse.json();
                            if (releaseData.body) {
                                setChangelog(releaseData.body);
                            }
                        }
                    }
                } catch (releaseError) {
                    console.warn('Не удалось загрузить описание релиза:', releaseError.message);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
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

    const isInstalled = useMemo(() => {
        if (!plugin) return false;
        if (installedPluginsForBot.some(p => p.sourceUri === plugin.repoUrl)) {
            return true;
        }
        if (installedPluginsForBot.some(p => p.name === plugin.name)) {
            return true;
        }
        return false;
    }, [installedPluginsForBot, plugin]);

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

    const formatDate = (date) => {
        const days = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Сегодня';
        if (days === 1) return 'Вчера';
        if (days < 7) return `${days} дней назад`;
        if (days < 30) return `${Math.floor(days / 7)} недель назад`;
        return `${Math.floor(days / 30)} месяцев назад`;
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
                <h2 className="text-2xl font-bold text-destructive">Плагин не найден</h2>
                <p className="text-muted-foreground mt-2">Не удалось загрузить информацию о плагине.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Вернуться назад
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="relative bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20 p-8">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]" />
                
                <div className="relative max-w-6xl mx-auto">
                    <Link to={`/bots/${botId}/plugins`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Вернуться в магазин
                    </Link>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-bold gradient-text">{plugin.displayName || plugin.name}</h1>
                                {plugin.verified && (
                                    <Shield className="h-6 w-6 text-blue-500" />
                                )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <span>от {plugin.author}</span>
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
                        
                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <Button 
                                size="lg"
                                className={cn(
                                    "w-full",
                                    isInstalled && "bg-green-600 hover:bg-green-700"
                                )}
                                disabled={isInstalling || isInstalled}
                                onClick={handleInstall}
                            >
                                {isInstalling ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Установка...
                                    </>
                                ) : isInstalled ? (
                                    <>
                                        <CheckCircle className="mr-2 h-5 w-5" />
                                        Установлен
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-5 w-5" />
                                        Установить
                                    </>
                                )}
                            </Button>
                            
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" asChild>
                                    <a href={plugin.repoUrl} target="_blank" rel="noopener noreferrer">
                                        <Github className="mr-2 h-4 w-4" />
                                        GitHub
                                    </a>
                                </Button>
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
                                    Форк
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card className="text-center p-4">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold">{plugin.downloads || 0}</p>
                        <p className="text-sm text-muted-foreground">Всего загрузок</p>
                    </Card>
                    <Card className="text-center p-4">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{formatDate(stats.lastUpdated)}</p>
                        <p className="text-sm text-muted-foreground">Обновлено</p>
                    </Card>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Обзор</TabsTrigger>
                        <TabsTrigger value="changelog">Изменения</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="mt-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Описание</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose prose-invert max-w-none">
                                            <ReactMarkdown>
                                                {plugin.fullDescription || plugin.description || 'Описание отсутствует.'}
                                            </ReactMarkdown>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Информация</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Версия</span>
                                            <span>{plugin.latestTag}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                {plugin.dependencies && plugin.dependencies.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <GitBranch className="h-5 w-5" />
                                                Зависимости
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
                                <CardTitle>Описание релиза</CardTitle>
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
                                        <p>Описание релиза не найдено</p>
                                        <p className="text-sm mt-2">
                                            Описание может быть добавлено в GitHub релиз плагина
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
