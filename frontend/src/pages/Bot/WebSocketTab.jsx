import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiHelper } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Eye, EyeOff, Key, Plus, Trash2, AlertTriangle, CheckCircle2, Settings, Activity, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const WebSocketTab = () => {
    const { botId } = useParams();
    const { toast } = useToast();
    const { t } = useTranslation('websocket');

    const [keys, setKeys] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [connectedClients, setConnectedClients] = useState(0);

    // Создание ключа
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyPermissions, setNewKeyPermissions] = useState('ReadWrite');
    const [creating, setCreating] = useState(false);
    const [createdKey, setCreatedKey] = useState(null);

    // Загрузка ключей
    const loadKeys = async () => {
        try {
            const response = await apiHelper(`/api/bots/${botId}/api-keys`);
            if (response.success) {
                setKeys(response.keys || []);
            }
        } catch (error) {
            console.error('[WebSocketTab] Error loading keys:', error);
            toast({
                title: t('messages.error'),
                description: t('messages.loadKeysError'),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Загрузка логов
    const loadLogs = async () => {
        setLogsLoading(true);
        try {
            const response = await apiHelper(`/api/bots/${botId}/api-keys/logs?limit=50`);
            if (response.success) {
                setLogs(response.logs || []);
            }
        } catch (error) {
            console.error('[WebSocketTab] Error loading logs:', error);
            toast({
                title: t('messages.error'),
                description: t('messages.loadLogsError'),
                variant: "destructive",
            });
        } finally {
            setLogsLoading(false);
        }
    };

    // Загрузка количества подключенных клиентов
    const loadConnectedClients = async () => {
        try {
            const response = await apiHelper(`/api/bots/${botId}/api-keys/connected`);
            if (response.success) {
                setConnectedClients(response.count || 0);
            }
        } catch (error) {
            console.error('[WebSocketTab] Error loading connected clients:', error);
        }
    };

    useEffect(() => {
        loadKeys();
        loadLogs();
        loadConnectedClients();

        // Автообновление количества подключенных клиентов каждые 5 секунд
        const interval = setInterval(loadConnectedClients, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [botId]);

    // Создать ключ
    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast({
                title: t('messages.error'),
                description: t('messages.enterKeyName'),
                variant: "destructive",
            });
            return;
        }

        setCreating(true);
        try {
            const response = await apiHelper(`/api/bots/${botId}/api-keys`, {
                method: 'POST',
                body: JSON.stringify({
                    name: newKeyName.trim(),
                    permissions: newKeyPermissions,
                }),
            });

            if (response.success) {
                setCreatedKey(response.key);
                setKeys([...keys, response.apiKey]);
                toast({
                    title: t('messages.success'),
                    description: t('messages.keyCreated'),
                });
            }
        } catch (error) {
            toast({
                title: t('messages.error'),
                description: t('messages.keyCreateError'),
                variant: "destructive",
            });
        } finally {
            setCreating(false);
        }
    };

    // Удалить ключ
    const handleDeleteKey = async (keyId) => {
        if (!confirm(t('messages.deleteConfirm'))) {
            return;
        }

        try {
            const response = await apiHelper(`/api/bots/${botId}/api-keys/${keyId}`, {
                method: 'DELETE',
            });
            if (response.success) {
                setKeys(keys.filter(k => k.id !== keyId));
                toast({
                    title: t('messages.success'),
                    description: t('messages.keyDeleted'),
                });
            }
        } catch (error) {
            toast({
                title: t('messages.error'),
                description: t('messages.keyDeleteError'),
                variant: "destructive",
            });
        }
    };

    // Копировать в буфер обмена
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: t('messages.copied'),
            description: t('messages.copiedHint'),
        });
    };

    const getPermissionBadge = (permission) => {
        const variants = {
            'Read': 'secondary',
            'Write': 'default',
            'ReadWrite': 'default',
        };
        return <Badge variant={variants[permission] || 'default'}>{t(`permissions.${permission}`) || permission}</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-end gap-3">
                <Card className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold text-green-500">{connectedClients}</p>
                            <p className="text-xs text-muted-foreground">{t('clients')}</p>
                        </div>
                    </div>
                </Card>
                <Button onClick={() => {
                    setNewKeyName('');
                    setNewKeyPermissions('ReadWrite');
                    setCreatedKey(null);
                    setCreateDialogOpen(true);
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createKey')}
                </Button>
            </div>

            <Tabs defaultValue="keys" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="keys">
                        <Key className="mr-2 h-4 w-4" />
                        {t('tabs.keys')}
                    </TabsTrigger>
                    <TabsTrigger value="logs">
                        <Activity className="mr-2 h-4 w-4" />
                        {t('tabs.logs')}
                    </TabsTrigger>
                    <TabsTrigger value="docs">
                        <Settings className="mr-2 h-4 w-4" />
                        {t('tabs.docs')}
                    </TabsTrigger>
                </TabsList>

                {/* Вкладка: API Ключи */}
                <TabsContent value="keys" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('keys.title')}</CardTitle>
                            <CardDescription>
                                {t('keys.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">{t('keys.loading')}</div>
                            ) : keys.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Key className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>{t('keys.empty')}</p>
                                    <p className="text-sm">{t('keys.emptyHint')}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('keys.name')}</TableHead>
                                            <TableHead>{t('keys.key')}</TableHead>
                                            <TableHead>{t('keys.permissions')}</TableHead>
                                            <TableHead>{t('keys.createdAt')}</TableHead>
                                            <TableHead>{t('keys.lastUsed')}</TableHead>
                                            <TableHead className="text-right">{t('keys.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {keys.map((key) => (
                                            <TableRow key={key.id}>
                                                <TableCell className="font-medium">{key.name}</TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">{key.keyPrefix}...</code>
                                                </TableCell>
                                                <TableCell>{getPermissionBadge(key.permissions)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(key.createdAt), 'dd MMM yyyy HH:mm', { locale: ru })}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {key.lastUsedAt
                                                        ? format(new Date(key.lastUsedAt), 'dd MMM yyyy HH:mm', { locale: ru })
                                                        : t('keys.never')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteKey(key.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Вкладка: Логи подключений */}
                <TabsContent value="logs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('logs.title')}</CardTitle>
                            <CardDescription>
                                {t('logs.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {logsLoading ? (
                                <div className="text-center py-8">{t('keys.loading')}</div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>{t('logs.empty')}</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[500px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('logs.action')}</TableHead>
                                                <TableHead>{t('logs.key')}</TableHead>
                                                <TableHead>{t('logs.ip')}</TableHead>
                                                <TableHead>{t('logs.time')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>
                                                        <Badge variant={log.action === 'connect' ? 'default' : 'secondary'}>
                                                            {log.action === 'connect' ? t('logs.connect') : t('logs.disconnect')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs bg-muted px-2 py-1 rounded">{log.keyPrefix}...</code>
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono">{log.ipAddress || 'N/A'}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm:ss', { locale: ru })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Вкладка: Документация */}
                <TabsContent value="docs" className="space-y-4">
                    <Alert className="bg-primary/10 border-primary/20">
                        <Settings className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <div>
                                    <strong>{t('docs.botId')}:</strong> <code className="ml-2 bg-background px-2 py-1 rounded text-sm font-mono">{botId}</code>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(botId)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('docs.title')}</CardTitle>
                            <CardDescription>
                                {t('docs.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('docs.endpoint')}</h3>
                                <code className="block bg-muted p-3 rounded text-sm">
                                    http://localhost:3001/bot-api
                                </code>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('docs.params')}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li><code>query.botId</code> - ID бота: <code className="bg-background px-1 rounded">{botId}</code></li>
                                    <li><code>auth.token</code> - Ваш API ключ</li>
                                </ul>
                            </div>

                            <Alert className="bg-green-500/10 border-green-500/20">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <AlertDescription>
                                    <strong className="text-green-700 dark:text-green-400">{t('docs.recommended')}:</strong> {t('docs.recommendedHint')}
                                </AlertDescription>
                            </Alert>

                            <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    {t('docs.sdkTitle')}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    {t('docs.sdkDescription')}
                                </p>
                                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`// Установка:
// npm install blockmine-sdk

const BlockMineBot = require('blockmine-sdk');

const bot = new BlockMineBot({
    url: 'http://localhost:3001',
    botId: ${botId},
    apiKey: 'bk_ваш_ключ_здесь'
});

async function main() {
    // Подключиться
    await bot.connect();
    console.log('Подключено!');

    // Проверить статус
    const isOnline = await bot.getStatus();
    console.log('Бот онлайн:', isOnline);

    // Слушать события чата
    bot.onChatMessage((data) => {
        console.log(\`[\${data.type}] \${data.username}: \${data.message}\`);
        console.log('Сырое сообщение:', data.raw_message);
    });

    // Слушать сырые сообщения (весь JSON от Minecraft)
    bot.onRawMessage((data) => {
        console.log('Текст:', data.raw_message);
        console.log('JSON:', data.json);

        // Доступ к дополнительным данным
        if (data.json.extra) {
            data.json.extra.forEach(part => {
                console.log('Часть:', part.text, 'Цвет:', part.color);
            });
        }
    });

    bot.onPlayerJoin((username) => {
        console.log(\`\${username} зашёл\`);
        bot.sendMessage(\`Привет, \${username}!\`);
    });

    // Отправить сообщение
    await bot.sendMessage('Привет всем!');

    // Получить данные пользователя
    const user = await bot.getUser('Player123');
    console.log('Группы:', user.groups);

    // Добавить в группу
    await bot.addUserToGroup('Player123', 'Admin');

    // Запустить граф
    await bot.triggerGraph('welcome_player', {
        playerName: 'Steve'
    });
}

main().catch(console.error);`}
                                </pre>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('docs.rawTitle')}</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    {t('docs.rawDescription')}
                                </p>
                                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`const io = require('socket.io-client');

const socket = io('http://localhost:3001/bot-api', {
    query: { botId: ${botId} },
    auth: { token: 'bk_ваш_ключ_здесь' }
});

socket.on('connect', () => {
    console.log('Подключено к боту!');
});

socket.on('connect_error', (error) => {
    console.error('Ошибка подключения:', error.message);
});

// Получаем статус бота (при подключении и при изменениях)
socket.on('bot:status', (data) => {
    console.log('Статус бота:', data.online ? 'ONLINE' : 'OFFLINE');
});

// Слушаем события чата
socket.on('chat:message', (data) => {
    console.log(\`[\${data.type}] \${data.username}: \${data.message}\`);
    console.log('Сырое сообщение:', data.raw_message);
});

// Слушаем сырые сообщения (весь JSON)
socket.on('chat:raw_message', (data) => {
    console.log('Текст:', data.raw_message);
    console.log('JSON:', data.json);
});

// Отправляем сообщение
socket.emit('action:send_message', {
    chatType: 'chat',
    message: 'Привет из API!'
});`}
                                </pre>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('docs.eventsTitle')}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    <li><code>bot:status</code> - Статус бота изменился (online: true/false)</li>
                                    <li><code>chat:message</code> - Сообщение в чате (type, username, message, raw_message)</li>
                                    <li><code>chat:raw_message</code> - Сырое сообщение из чата (raw_message, json)</li>
                                    <li><code>player:join</code> - Игрок зашел (username)</li>
                                    <li><code>player:leave</code> - Игрок вышел (username)</li>
                                    <li><code>bot:health</code> - Здоровье бота (health, food)</li>
                                    <li><code>bot:death</code> - Бот умер</li>
                                    <li><code>plugin:custom_event</code> - Кастомное событие от плагина</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('docs.actionsTitle')}</h3>
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-medium text-sm mb-1">Статус и управление ботом:</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                                            <li><code>action:get_status</code> - Проверить статус бота</li>
                                            <li><code>action:send_message</code> - Отправить сообщение (chatType, message, recipient?)</li>
                                            <li><code>action:trigger_graph</code> - Запустить визуальный граф (graphName, context?)</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-sm mb-1">Работа с пользователями:</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                                            <li><code>action:get_user</code> - Получить данные пользователя (username)</li>
                                            <li><code>action:update_user</code> - Обновить пользователя (username, operation, value)</li>
                                        </ul>
                                        <div className="mt-2 text-xs text-muted-foreground ml-6">
                                            <p className="mb-1">Операции для update_user:</p>
                                            <ul className="list-disc list-inside ml-2">
                                                <li><code>addGroup</code> - добавить группу (value: имя группы)</li>
                                                <li><code>removeGroup</code> - удалить группу (value: имя группы)</li>
                                                <li><code>setBlacklist</code> - установить blacklist (value: true/false)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('docs.examplesTitle')}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            SDK (рекомендуется):
                                        </h4>
                                        <div className="space-y-3 ml-6">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Проверка статуса:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`const isOnline = await bot.getStatus();`}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Получить пользователя:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`const user = await bot.getUser('Player123');`}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Добавить в группу:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`await bot.addUserToGroup('Player123', 'Admin');`}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Добавить в blacklist:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`await bot.setUserBlacklist('Hacker', true);`}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-sm mb-2">Raw Socket.IO:</h4>
                                        <div className="space-y-3 ml-6">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Проверка статуса бота:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`socket.emit('action:get_status');
socket.on('action:result', (data) => {
  if (data.action === 'get_status') {
    console.log('Бот онлайн:', data.online);
  }
});`}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Получить данные пользователя:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`socket.emit('action:get_user', { username: 'Player123' });
socket.on('action:result', (data) => {
  if (data.action === 'get_user') {
    console.log('Пользователь:', data.user);
  }
});`}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Добавить пользователю группу:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`socket.emit('action:update_user', {
  username: 'Player123',
  operation: 'addGroup',
  value: 'Admin'
});`}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Добавить в blacklist:</p>
                                                <pre className="bg-muted p-2 rounded text-xs">
{`socket.emit('action:update_user', {
  username: 'Hacker',
  operation: 'setBlacklist',
  value: true
});`}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Диалог создания ключа */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('createDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('createDialog.description')}
                        </DialogDescription>
                    </DialogHeader>

                    {createdKey ? (
                        <div className="space-y-4">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {t('createDialog.saveWarning')}
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <Label>{t('createDialog.keyCreated')}</Label>
                                <div className="flex gap-2">
                                    <Input value={createdKey} readOnly className="font-mono text-sm" />
                                    <Button onClick={() => copyToClipboard(createdKey)} size="icon">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('createDialog.nameLabel')}</Label>
                                <Input
                                    placeholder={t('createDialog.namePlaceholder')}
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('createDialog.permissionsLabel')}</Label>
                                <Select value={newKeyPermissions} onValueChange={setNewKeyPermissions}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Read">{t('createDialog.readOnly')}</SelectItem>
                                        <SelectItem value="Write">{t('createDialog.writeOnly')}</SelectItem>
                                        <SelectItem value="ReadWrite">{t('createDialog.readWrite')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {createdKey ? (
                            <Button onClick={() => setCreateDialogOpen(false)}>{t('createDialog.close')}</Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                    {t('createDialog.cancel')}
                                </Button>
                                <Button onClick={handleCreateKey} disabled={creating}>
                                    {creating ? t('createDialog.creating') : t('createDialog.create')}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WebSocketTab;
