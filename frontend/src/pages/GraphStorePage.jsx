import React, { useState, useEffect } from 'react';
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
            console.error('Ошибка загрузки категорий:', error);
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
            console.error('Ошибка загрузки графов:', error);
            setGraphs([]);
            setServerAvailable(false);
            toast.error('Сервер магазина графов недоступен');
        } finally {
            setLoading(false);
        }
    };

    const loadBots = async () => {
        try {
            const botsData = await api.get('/api/bots');
            setBots(botsData || []);
        } catch (error) {
            console.error('Ошибка загрузки ботов:', error);
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
            toast.error('Выберите бота для установки');
            return;
        }

        try {
            setInstalling(true);
            
            const response = await fetch(`${STATS_SERVER_URL}/api/graphs/${selectedGraph.id}/download`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Не удалось получить данные графа');
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
                    await api.post(`/api/bots/${selectedBot}/commands`, commandData, 'Команда успешно создана!');
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        const newName = prompt(`Команда с именем "${selectedGraph.name}" уже существует. Введите новое имя для команды:`, `${selectedGraph.name}_copy`);
                        if (newName && newName.trim()) {
                            commandData.name = newName.trim();
                            await api.post(`/api/bots/${selectedBot}/commands`, commandData, 'Команда успешно создана!');
                        } else {
                            throw new Error('Установка отменена');
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
                    await api.post(`/api/bots/${selectedBot}/event-graphs`, eventData, 'Событие успешно создано!');
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        const newName = prompt(`Событие с именем "${selectedGraph.name}" уже существует. Введите новое имя для события:`, `${selectedGraph.name}_copy`);
                        if (newName && newName.trim()) {
                            eventData.name = newName.trim();
                            await api.post(`/api/bots/${selectedBot}/event-graphs`, eventData, 'Событие успешно создано!');
                        } else {
                            throw new Error('Установка отменена');
                        }
                    } else {
                        throw error;
                    }
                }
            } else {
                throw new Error('Неизвестный тип графа');
            }
            
            setInstallDialogOpen(false);
            setSelectedGraph(null);
            setSelectedBot('');
            
        } catch (error) {
            console.error('Ошибка установки:', error);
            toast.error(error.message || 'Ошибка при установке графа');
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
                toast.success('Спасибо за лайк!');
                loadGraphs();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Ошибка при постановке лайка');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            toast.error('Сервер недоступен. Попробуйте позже.');
        }
    };

    const handlePublish = async () => {
        try {
            if (!publishForm.name || !publishForm.author || !publishForm.description || !publishForm.graphData) {
                toast.error('Все поля обязательны');
                return;
            }

            if (publishForm.description.length < 10) {
                toast.error('Описание должно содержать минимум 10 символов');
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
                toast.success('Граф опубликован и ожидает модерации!');
                setPublishDialogOpen(false);
                setPublishForm({
                    name: '',
                    author: '',
                    description: '',
                    graphData: null
                });
            } else {
                const error = await response.json();
                toast.error(error.error || 'Ошибка при публикации');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            toast.error('Сервер недоступен. Попробуйте позже.');
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
                    toast.success('Граф загружен');
                } catch (error) {
                    toast.error('Ошибка при чтении файла');
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
                        Магазин графов
                    </h1>
                    <p className="text-muted-foreground mt-1">Публикуйте и устанавливайте визуальные графы для ваших ботов</p>
                </div>
                <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!serverAvailable} className="border-blue-500/20 hover:bg-blue-500/5 hover:border-blue-500/40">
                            <Upload className="w-4 h-4 mr-2" />
                            Опубликовать граф
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Опубликовать граф</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Название</Label>
                                <Input
                                    id="name"
                                    value={publishForm.name}
                                    onChange={(e) => setPublishForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Название графа"
                                />
                            </div>
                            <div>
                                <Label htmlFor="author">Автор</Label>
                                <Input
                                    id="author"
                                    value={publishForm.author}
                                    onChange={(e) => setPublishForm(prev => ({ ...prev, author: e.target.value }))}
                                    placeholder="Ваше имя"
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Описание</Label>
                                <Textarea
                                    id="description"
                                    value={publishForm.description}
                                    onChange={(e) => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Описание графа (минимум 10 символов)"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="file">Файл графа (JSON)</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handlePublish} className="flex-1">
                                    Опубликовать
                                </Button>
                                <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                                    Отмена
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
                                Сервер магазина графов недоступен
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>Данные не могут быть загружены. Попробуйте обновить страницу позже.</p>
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
                                    placeholder="Поиск графов..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!serverAvailable}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Все категории" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все категории</SelectItem>
                                {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedType} onValueChange={setSelectedType} disabled={!serverAvailable}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Все типы" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все типы</SelectItem>
                                <SelectItem value="COMMAND">Команды</SelectItem>
                                <SelectItem value="EVENT">События</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : graphs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Графы не найдены</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {graphs.map(graph => (
                        <Card key={graph.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{graph.name}</CardTitle>
                                    <Badge variant={graph.graphType === 'COMMAND' ? 'default' : 'secondary'}>
                                        {graph.graphType === 'COMMAND' ? 'Команда' : 'Событие'}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Автор: {graph.author} | {graph.category.name}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                    {graph.description}
                                </p>
                                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                                    <span>📥 {graph.downloads} скачиваний</span>
                                    <span>❤️ {graph.likes} лайков</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={() => handleInstall(graph)} 
                                        size="sm" 
                                        className="flex-1"
                                        disabled={!serverAvailable}
                                    >
                                        <Settings className="w-4 h-4 mr-1" />
                                        Установить
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
                        <DialogTitle>Установить граф</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedGraph && (
                            <div className="p-3 bg-muted rounded-md">
                                <h4 className="font-medium">{selectedGraph.name}</h4>
                                <p className="text-sm text-muted-foreground">{selectedGraph.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Автор: {selectedGraph.author} | Тип: {selectedGraph.graphType === 'COMMAND' ? 'Команда' : 'Событие'}
                                </p>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="bot-select">Выберите бота</Label>
                            <Select value={selectedBot} onValueChange={setSelectedBot}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите бота для установки" />
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
                                {installing ? 'Установка...' : 'Установить'}
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => setInstallDialogOpen(false)}
                                disabled={installing}
                            >
                                Отмена
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 