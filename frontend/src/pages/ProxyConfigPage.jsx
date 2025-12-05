import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';
import { Globe, Search, X, Loader2, TestTube, Check, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiHelper } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export default function ProxyConfigPage() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const applyProxyToBots = useAppStore(state => state.applyProxyToBots);

    const [proxies, setProxies] = useState([]);
    const [isLoadingProxies, setIsLoadingProxies] = useState(true);
    const [selectedProxyId, setSelectedProxyId] = useState('');

    const [selectedBots, setSelectedBots] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [isApplying, setIsApplying] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    useEffect(() => {
        fetchProxies();
    }, []);

    const fetchProxies = async () => {
        setIsLoadingProxies(true);
        try {
            const data = await apiHelper('/api/proxies');
            setProxies(data.items || []);
        } catch (error) {
            console.error('Ошибка загрузки прокси:', error);
            toast({
                title: "Ошибка",
                description: "Не удалось загрузить список прокси",
                variant: "destructive",
            });
        }
        setIsLoadingProxies(false);
    };

    const selectedProxy = proxies.find(p => p.id === parseInt(selectedProxyId));

    const filteredBots = useMemo(() => {
        return bots.filter(bot => 
            bot.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bot.server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bot.note && bot.note.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [bots, searchTerm]);

    const groupedBots = useMemo(() => {
        const running = filteredBots.filter(bot => botStatuses[bot.id] === 'running');
        const stopped = filteredBots.filter(bot => botStatuses[bot.id] !== 'running');
        return { running, stopped };
    }, [filteredBots, botStatuses]);


    const handleBotSelection = (botId, checked) => {
        setSelectedBots(prev => 
            checked 
                ? [...prev, botId]
                : prev.filter(id => id !== botId)
        );
    };

    const handleSelectAll = (checked) => {
        setSelectedBots(checked ? filteredBots.map(bot => bot.id) : []);
    };

    const handleApplyProxy = async () => {
        if (!selectedProxyId) {
            toast({
                title: "Ошибка",
                description: "Выберите прокси из списка",
                variant: "destructive",
            });
            return;
        }

        if (selectedBots.length === 0) {
            toast({
                title: "Ошибка",
                description: "Выберите хотя бы одного бота",
                variant: "destructive",
            });
            return;
        }

        setShowConfirmDialog(true);
    };

    const confirmApplyProxy = async () => {
        setIsApplying(true);
        setShowConfirmDialog(false);

        try {
            const result = await applyProxyToBots(selectedBots, { proxyId: parseInt(selectedProxyId) });

            if (result.success) {
                toast({
                    title: "Успех!",
                    description: `Настройки прокси применены к ${selectedBots.length} бот(ам)`,
                });

                setSelectedProxyId('');
                setSelectedBots([]);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Proxy application error:', error);
            toast({
                title: "Ошибка",
                description: error.message || "Не удалось применить настройки прокси",
                variant: "destructive",
            });
        } finally {
            setIsApplying(false);
        }
    };

    const handleClearForm = () => {
        setSelectedProxyId('');
        setSelectedBots([]);
        setSearchTerm('');
    };

    const selectedBotsCount = selectedBots.length;
    const totalBotsCount = filteredBots.length;
    const allSelected = selectedBotsCount === totalBotsCount && totalBotsCount > 0;

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
                <Globe className="h-8 w-8 text-blue-600" />
                <div>
                    <h1 className="text-3xl font-bold">Прокси конфигурация</h1>
                    <p className="text-muted-foreground">Настройка прокси для нескольких ботов одновременно</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Выбор прокси
                        </CardTitle>
                        <CardDescription>
                            Выберите прокси из списка для применения к ботам
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Прокси сервер</Label>
                            <Select value={selectedProxyId} onValueChange={setSelectedProxyId} disabled={isLoadingProxies}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingProxies ? "Загрузка..." : "Выберите прокси"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {proxies.length === 0 ? (
                                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                            Нет доступных прокси
                                        </div>
                                    ) : (
                                        proxies.map(proxy => (
                                            <SelectItem key={proxy.id} value={proxy.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{proxy.name}</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {proxy.type?.toUpperCase()}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {proxy.host}:{proxy.port}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedProxy && (
                            <div className="p-3 bg-muted rounded-lg space-y-2">
                                <p className="text-sm font-medium">Информация о прокси:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Адрес:</span>
                                        <p className="font-medium">{selectedProxy.host}:{selectedProxy.port}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Тип:</span>
                                        <p className="font-medium">{selectedProxy.type?.toUpperCase()}</p>
                                    </div>
                                    {selectedProxy.username && (
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Авторизация:</span>
                                            <p className="font-medium">Да ({selectedProxy.username})</p>
                                        </div>
                                    )}
                                    {selectedProxy.note && (
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Заметка:</span>
                                            <p className="font-medium">{selectedProxy.note}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/proxies')}
                                className="flex-1"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Управление прокси
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleClearForm}
                                disabled={isApplying}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Очистить
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Выбор ботов</span>
                            <Badge variant="secondary">
                                {selectedBotsCount}/{totalBotsCount}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Выберите ботов для применения настроек прокси
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Поиск ботов..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="select-all"
                                    checked={allSelected}
                                    onCheckedChange={handleSelectAll}
                                />
                                <Label htmlFor="select-all" className="text-sm font-medium">
                                    Выбрать всех ({totalBotsCount})
                                </Label>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {groupedBots.running.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-green-600 mb-2">
                                        Запущенные боты ({groupedBots.running.length})
                                    </p>
                                    {groupedBots.running.map(bot => (
                                        <div key={bot.id} className="flex items-center space-x-3 p-2 rounded-lg border">
                                            <Checkbox
                                                id={`bot-${bot.id}`}
                                                checked={selectedBots.includes(bot.id)}
                                                onCheckedChange={(checked) => handleBotSelection(bot.id, checked)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    <Label htmlFor={`bot-${bot.id}`} className="font-medium truncate">
                                                        {bot.username}
                                                    </Label>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {bot.note || `${bot.server.host}:${bot.server.port}`}
                                                </p>
                                                {bot.proxyHost && (
                                                    <p className="text-xs text-blue-600">
                                                        Прокси: {bot.proxyHost}:{bot.proxyPort}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {groupedBots.stopped.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-2 mt-4">
                                        Остановленные боты ({groupedBots.stopped.length})
                                    </p>
                                    {groupedBots.stopped.map(bot => (
                                        <div key={bot.id} className="flex items-center space-x-3 p-2 rounded-lg border opacity-75">
                                            <Checkbox
                                                id={`bot-${bot.id}`}
                                                checked={selectedBots.includes(bot.id)}
                                                onCheckedChange={(checked) => handleBotSelection(bot.id, checked)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                    <Label htmlFor={`bot-${bot.id}`} className="font-medium truncate">
                                                        {bot.username}
                                                    </Label>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {bot.note || `${bot.server.host}:${bot.server.port}`}
                                                </p>
                                                {bot.proxyHost && (
                                                    <p className="text-xs text-blue-600">
                                                        Прокси: {bot.proxyHost}:{bot.proxyPort}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {filteredBots.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>Боты не найдены</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t">
                            <Button
                                onClick={handleApplyProxy}
                                disabled={isApplying || selectedBotsCount === 0 || !selectedProxyId}
                                className="w-full"
                                size="lg"
                            >
                                {isApplying ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Применить к выбранным ({selectedBotsCount})
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Подтверждение применения прокси</DialogTitle>
                        <DialogDescription>
                            Вы собираетесь применить настройки прокси к {selectedBotsCount} бот(ам).
                            Это действие обновит конфигурацию ботов.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProxy && (
                        <div className="py-4">
                            <div className="space-y-2 text-sm">
                                <p><strong>Прокси:</strong> {selectedProxy.name}</p>
                                <p><strong>Адрес:</strong> {selectedProxy.host}:{selectedProxy.port}</p>
                                <p><strong>Тип:</strong> {selectedProxy.type?.toUpperCase()}</p>
                                {selectedProxy.username && (
                                    <p><strong>Авторизация:</strong> Да ({selectedProxy.username})</p>
                                )}
                                <p><strong>Количество ботов:</strong> {selectedBotsCount}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Отмена
                        </Button>
                        <Button onClick={confirmApplyProxy}>
                            Применить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}