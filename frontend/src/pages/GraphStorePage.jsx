import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Heart, Upload, Search, Settings, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';

const STATS_SERVER_URL = 'http://185.65.200.184:3000';

export default function GraphStorePage() {
    const { t } = useTranslation('graph-store');
    const [graphs, setGraphs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bots, setBots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [serverAvailable, setServerAvailable] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [installDialogOpen, setInstallDialogOpen] = useState(false);
    const [selectedGraph, setSelectedGraph] = useState(null);
    const [selectedBot, setSelectedBot] = useState('');
    const [installing, setInstalling] = useState(false);
    const [publishForm, setPublishForm] = useState({
        name: '',
        author: '',
        description: '',
        graphData: null
    });

    useEffect(() => {
        loadCategories();
        loadGraphs();
        loadBots();
    }, []);

    const loadCategories = async () => {
        try {
            const response = await fetch(`${STATS_SERVER_URL}/api/graphs/categories`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
            setCategories([]);
            setServerAvailable(false);
        }
    };

    const loadGraphs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
            if (selectedType && selectedType !== 'all') params.append('type', selectedType);
            if (searchQuery) params.append('search', searchQuery);

            const response = await fetch(`${STATS_SERVER_URL}/api/graphs?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setGraphs(data.graphs || []);
        } catch (error) {
            console.error('Error loading graphs:', error);
            setGraphs([]);
            setServerAvailable(false);
            toast.error(t('messages.serverUnavailable'));
        } finally {
            setLoading(false);
        }
    };

    const loadBots = async () => {
        try {
            const botsData = await api.get('/api/bots');
            setBots(botsData || []);
        } catch (error) {
            console.error('Error loading bots:', error);
            setBots([]);
        }
    };

    const handleInstall = async (graph) => {
        setSelectedGraph(graph);
        setSelectedBot('');
        setInstallDialogOpen(true);
    };

    const handleInstallConfirm = async () => {
        if (!selectedBot) {
            toast.error(t('messages.selectBotError'));
            return;
        }

        try {
            setInstalling(true);
            
            const response = await fetch(`${STATS_SERVER_URL}/api/graphs/${selectedGraph.id}/download`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(t('messages.downloadError'));
            }
            
            const data = await response.json();
            const graphData = data.graphData;
            
            const graphType = selectedGraph.graphType;
            
            const graphJson = JSON.stringify(graphData);
            
            if (graphType === 'COMMAND') {
                const commandData = {
                    name: selectedGraph.name,
                    description: selectedGraph.description,
                    graphJson: graphJson,
                    isEnabled: true,
                    isVisual: true,
                    aliases: [],
                    cooldown: 0,
                    permissionId: null,
                    allowedChatTypes: '["chat", "private"]',
                    argumentsJson: '[]'
                };
                
                try {
                    await api.post(`/api/bots/${selectedBot}/commands`, commandData, t('messages.commandCreated'));
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        const newName = prompt(t('messages.alreadyExistsCommand', { name: selectedGraph.name }), `${selectedGraph.name}_copy`);
                        if (newName && newName.trim()) {
                            commandData.name = newName.trim();
                            await api.post(`/api/bots/${selectedBot}/commands`, commandData, t('messages.commandCreated'));
                        } else {
                            throw new Error(t('messages.installCancelled'));
                        }
                    } else {
                        throw error;
                    }
                }
            } else if (graphType === 'EVENT') {
                const eventData = {
                    name: selectedGraph.name,
                    graphJson: graphJson,
                    isEnabled: true,
                    variables: JSON.stringify(graphData.variables || [])
                };
                
                try {
                    await api.post(`/api/bots/${selectedBot}/event-graphs`, eventData, t('messages.eventCreated'));
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        const newName = prompt(t('messages.alreadyExistsEvent', { name: selectedGraph.name }), `${selectedGraph.name}_copy`);
                        if (newName && newName.trim()) {
                            eventData.name = newName.trim();
                            await api.post(`/api/bots/${selectedBot}/event-graphs`, eventData, t('messages.eventCreated'));
                        } else {
                            throw new Error(t('messages.installCancelled'));
                        }
                    } else {
                        throw error;
                    }
                }
            } else {
                throw new Error(t('messages.unknownType'));
            }
            
            setInstallDialogOpen(false);
            setSelectedGraph(null);
            setSelectedBot('');
            
        } catch (error) {
            console.error('Installation error:', error);
            toast.error(error.message || t('messages.installError'));
        } finally {
            setInstalling(false);
        }
    };

    const handleLike = async (graphId) => {
        try {
            let instanceId = localStorage.getItem('graphStoreInstanceId');
            if (!instanceId) {
                instanceId = 'web-' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('graphStoreInstanceId', instanceId);
            }
            
            const response = await fetch(`${STATS_SERVER_URL}/api/graphs/${graphId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId })
            });
            
            if (response.ok) {
                toast.success(t('messages.likeSuccess'));
                loadGraphs();
            } else {
                const error = await response.json();
                toast.error(error.error || t('messages.likeError'));
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(t('messages.serverUnavailable'));
        }
    };

    const handlePublish = async () => {
        try {
            if (!publishForm.name || !publishForm.author || !publishForm.description || !publishForm.graphData) {
                toast.error(t('messages.allFieldsRequired'));
                return;
            }

            if (publishForm.description.length < 10) {
                toast.error(t('messages.descriptionMin'));
                return;
            }

            let graphType = 'COMMAND';
            let categoryId = 1;

            if (publishForm.graphData.command) {
                graphType = 'COMMAND';
                categoryId = 1;
            } else if (publishForm.graphData.event) {
                graphType = 'EVENT';
                categoryId = 2;
            }

            const response = await fetch(`${STATS_SERVER_URL}/api/graphs/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...publishForm,
                    graphType,
                    categoryId
                })
            });

            if (response.ok) {
                toast.success(t('messages.publishSuccess'));
                setPublishDialogOpen(false);
                setPublishForm({
                    name: '',
                    author: '',
                    description: '',
                    graphData: null
                });
            } else {
                const error = await response.json();
                toast.error(error.error || t('messages.publishError'));
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(t('messages.serverUnavailable'));
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const graphData = JSON.parse(e.target.result);
                    setPublishForm(prev => ({ ...prev, graphData }));
                    toast.success(t('messages.graphLoaded'));
                } catch (error) {
                    toast.error(t('messages.fileReadError'));
                }
            };
            reader.readAsText(file);
        }
    };

    useEffect(() => {
        loadGraphs();
    }, [selectedCategory, selectedType, searchQuery]);

    return (
        <div className="flex flex-col h-full w-full p-6 sm:p-8 gap-6 overflow-y-auto">
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
                </div>
                <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!serverAvailable} className="border-blue-500/20 hover:bg-blue-500/5 hover:border-blue-500/40">
                            <Upload className="w-4 h-4 mr-2" />
                            {t('publish.button')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('publish.title')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">{t('publish.name')}</Label>
                                <Input
                                    id="name"
                                    value={publishForm.name}
                                    onChange={(e) => setPublishForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('publish.namePlaceholder')}
                                />
                            </div>
                            <div>
                                <Label htmlFor="author">{t('publish.author')}</Label>
                                <Input
                                    id="author"
                                    value={publishForm.author}
                                    onChange={(e) => setPublishForm(prev => ({ ...prev, author: e.target.value }))}
                                    placeholder={t('publish.authorPlaceholder')}
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">{t('publish.description')}</Label>
                                <Textarea
                                    id="description"
                                    value={publishForm.description}
                                    onChange={(e) => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder={t('publish.descriptionPlaceholder')}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="file">{t('publish.file')}</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handlePublish} className="flex-1">
                                    {t('publish.submit')}
                                </Button>
                                <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                                    {t('publish.cancel')}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </header>

            {!serverAvailable && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                {t('warning.title')}
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>{t('warning.description')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder={t('search.placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!serverAvailable}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder={t('search.allCategories')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('search.allCategories')}</SelectItem>
                                {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedType} onValueChange={setSelectedType} disabled={!serverAvailable}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder={t('search.allTypes')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('search.allTypes')}</SelectItem>
                                <SelectItem value="COMMAND">{t('search.commands')}</SelectItem>
                                <SelectItem value="EVENT">{t('search.events')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
            ) : graphs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('empty')}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {graphs.map(graph => (
                        <Card key={graph.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{graph.name}</CardTitle>
                                    <Badge variant={graph.graphType === 'COMMAND' ? 'default' : 'secondary'}>
                                        {graph.graphType === 'COMMAND' ? t('card.command') : t('card.event')}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {t('card.author')}: {graph.author} | {graph.category.name}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                    {graph.description}
                                </p>
                                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                                    <span>📥 {graph.downloads} {t('card.downloads')}</span>
                                    <span>❤️ {graph.likes} {t('card.likes')}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleInstall(graph)}
                                        size="sm"
                                        className="flex-1"
                                        disabled={!serverAvailable}
                                    >
                                        <Settings className="w-4 h-4 mr-1" />
                                        {t('card.install')}
                                    </Button>
                                    <Button 
                                        onClick={() => handleLike(graph.id)} 
                                        size="sm" 
                                        variant="outline"
                                        disabled={!serverAvailable}
                                    >
                                        <Heart className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('install.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedGraph && (
                            <div className="p-3 bg-muted rounded-md">
                                <h4 className="font-medium">{selectedGraph.name}</h4>
                                <p className="text-sm text-muted-foreground">{selectedGraph.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('card.author')}: {selectedGraph.author} | {t('install.type')}: {selectedGraph.graphType === 'COMMAND' ? t('card.command') : t('card.event')}
                                </p>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="bot-select">{t('install.selectBot')}</Label>
                            <Select value={selectedBot} onValueChange={setSelectedBot}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('install.selectBotPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {bots.map(bot => (
                                        <SelectItem key={bot.id} value={bot.id.toString()}>
                                            {bot.username} {bot.note && `(${bot.note})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleInstallConfirm}
                                className="flex-1"
                                disabled={!selectedBot || installing}
                            >
                                {installing ? t('install.installing') : t('install.submit')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setInstallDialogOpen(false)}
                                disabled={installing}
                            >
                                {t('install.cancel')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 