import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, CheckCircle, Loader2, Github, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';

export default function PluginDetailPage() {
    const { pluginName, botId } = useParams();
    const intBotId = parseInt(botId, 10);
    
    const allInstalledPlugins = useAppStore(state => state.installedPlugins);
    const installPluginFromRepo = useAppStore(state => state.installPluginFromRepo);
    const fetchInstalledPlugins = useAppStore(state => state.fetchInstalledPlugins);

    const installedPluginsForBot = useMemo(() => allInstalledPlugins[intBotId] || [], [allInstalledPlugins, intBotId]);

    const [plugin, setPlugin] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInstalling, setIsInstalling] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchPluginDetails = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/plugins/catalog/${pluginName}`);
                if (!response.ok) throw new Error('Плагин не найден');
                const data = await response.json();
                setPlugin(data);
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
        return installedPluginsForBot.some(p => p.sourceUri === plugin.repoUrl);
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

    if (isLoading) {
        return <div className="p-8 text-center">Загрузка информации о плагине...</div>;
    }

    if (!plugin) {
        return <div className="p-8 text-center text-destructive">Не удалось загрузить информацию о плагине.</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto overflow-y-auto h-full">
            <Link to={`/bots/${botId}/plugins`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Назад в магазин
            </Link>
            
            <header className="flex flex-col md:flex-row gap-4 justify-between items-start mb-6">
                <div>
                    <h1 className="text-4xl font-bold">{plugin.name}</h1>
                    <p className="text-lg text-muted-foreground">Автор: {plugin.author}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {(plugin.categories || []).map(tag => <Badge key={tag}>{tag}</Badge>)}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <a href={plugin.repoUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline"><Github className="mr-2"/>GitHub</Button>
                    </a>
                    <Button disabled={isInstalling || isInstalled} onClick={handleInstall}>
                        {isInstalling ? <Loader2 className="mr-2 animate-spin" /> : isInstalled ? <CheckCircle className="mr-2" /> : <Download className="mr-2" />}
                        {isInstalling ? 'Установка...' : isInstalled ? 'Установлен' : 'Установить'}
                    </Button>
                </div>
            </header>

            <Separator />
            
            <main className="mt-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="prose prose-invert max-w-none">
                            <ReactMarkdown>
                                {plugin.fullDescription || plugin.description || 'Описание отсутствует.'}
                            </ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>

                {plugin.dependencies && plugin.dependencies.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold mb-3">Зависимости</h3>
                        <Card>
                            <CardContent className="p-4">
                                <ul className="list-disc list-inside text-sm">
                                    {plugin.dependencies.map((dep) => (
                                        <li key={dep}>{dep}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}