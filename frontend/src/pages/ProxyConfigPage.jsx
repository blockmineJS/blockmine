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
import { Globe, Search, CheckAll, X, Loader2, TestTube, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ProxyConfigPage() {
    const { toast } = useToast();
    const bots = useAppStore(state => state.bots);
    const botStatuses = useAppStore(state => state.botStatuses);
    const applyProxyToBots = useAppStore(state => state.applyProxyToBots);
    
    const [proxySettings, setProxySettings] = useState({
        host: '',
        port: '',
        username: '',
        password: ''
    });
    
    const [selectedBots, setSelectedBots] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isApplying, setIsApplying] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [errors, setErrors] = useState({});
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

    const validateProxySettings = (settings) => {
        const newErrors = {};
        
        if (!settings.host.trim()) {
            newErrors.host = 'IP адрес обязателен';
        } else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(settings.host.trim())) {
            newErrors.host = 'Неверный формат IP адреса';
        }
        
        if (!settings.port.trim()) {
            newErrors.port = 'Порт обязателен';
        } else {
            const port = parseInt(settings.port);
            if (isNaN(port) || port < 1 || port > 65535) {
                newErrors.port = 'Порт должен быть между 1 и 65535';
            }
        }
        
        if (settings.username && settings.username.length < 3) {
            newErrors.username = 'Имя пользователя должно содержать минимум 3 символа';
        }
        
        return newErrors;
    };

    const handleSettingsChange = (field, value) => {
        setProxySettings(prev => ({
            ...prev,
            [field]: value
        }));
        
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

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

    const handleTestConnection = async () => {
        const validationErrors = validateProxySettings(proxySettings);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsTesting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast({
                title: "Тест соединения",
                description: "Подключение к проксе успешно!",
            });
        } catch (error) {
            toast({
                title: "Ошибка теста",
                description: "Не удалось подключиться к прокси серверу",
                variant: "destructive",
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleApplyProxy = async () => {
        const validationErrors = validateProxySettings(proxySettings);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
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
            const proxyData = {
                proxyHost: proxySettings.host.trim(),
                proxyPort: parseInt(proxySettings.port),
                proxyUsername: proxySettings.username.trim() || null,
                proxyPassword: proxySettings.password || null
            };

            const result = await applyProxyToBots(selectedBots, proxyData);
            
            if (result.success) {
                toast({
                    title: "Успех!",
                    description: `Настройки прокси применены к ${selectedBots.length} бот(ам)`,
                });
                
                setProxySettings({ host: '', port: '', username: '', password: '' });
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
        setProxySettings({ host: '', port: '', username: '', password: '' });
        setSelectedBots([]);
        setErrors({});
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
                            Настройки прокси
                        </CardTitle>
                        <CardDescription>
                            Введите параметры SOCKS5 прокси сервера
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="host">IP адрес *</Label>
                                <Input
                                    id="host"
                                    placeholder="127.0.0.1"
                                    value={proxySettings.host}
                                    onChange={(e) => handleSettingsChange('host', e.target.value)}
                                    className={cn(errors.host && "border-red-500")}
                                />
                                {errors.host && (
                                    <p className="text-sm text-red-500">{errors.host}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Порт *</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    placeholder="1080"
                                    min="1"
                                    max="65535"
                                    value={proxySettings.port}
                                    onChange={(e) => handleSettingsChange('port', e.target.value)}
                                    className={cn(errors.port && "border-red-500")}
                                />
                                {errors.port && (
                                    <p className="text-sm text-red-500">{errors.port}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="username">Имя пользователя</Label>
                            <Input
                                id="username"
                                placeholder="Оставьте пустым если не требуется"
                                value={proxySettings.username}
                                onChange={(e) => handleSettingsChange('username', e.target.value)}
                                className={cn(errors.username && "border-red-500")}
                            />
                            {errors.username && (
                                <p className="text-sm text-red-500">{errors.username}</p>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Оставьте пустым если не требуется"
                                value={proxySettings.password}
                                onChange={(e) => handleSettingsChange('password', e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={isTesting || !proxySettings.host || !proxySettings.port}
                                className="flex-1"
                            >
                                {isTesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <TestTube className="h-4 w-4 mr-2" />
                                )}
                                Тест соединения
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
                                disabled={isApplying || selectedBotsCount === 0 || !proxySettings.host || !proxySettings.port}
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
                    <div className="py-4">
                        <div className="space-y-2 text-sm">
                            <p><strong>Прокси сервер:</strong> {proxySettings.host}:{proxySettings.port}</p>
                            {proxySettings.username && (
                                <p><strong>Пользователь:</strong> {proxySettings.username}</p>
                            )}
                            <p><strong>Количество ботов:</strong> {selectedBotsCount}</p>
                        </div>
                    </div>
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