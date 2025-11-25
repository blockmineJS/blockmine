import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function PanelApiKeysPage() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState(null);
    const [showCreatedKey, setShowCreatedKey] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const data = await api.get('/api/panel/api-keys');
            setKeys(data.keys || []);
        } catch (err) {
            console.error('Ошибка загрузки API ключей:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: 'Имя ключа обязательно'
            });
            return;
        }

        try {
            const data = await api.post('/api/panel/api-keys', { name: newKeyName.trim() });
            setCreatedKey(data.key);
            setNewKeyName('');
            setCreateDialogOpen(false);
            fetchKeys();
            toast({
                title: 'Успех',
                description: 'API ключ успешно создан'
            });
        } catch (err) {
            console.error('Ошибка создания API ключа:', err);
        }
    };

    const handleDeleteKey = async (keyId) => {
        if (!confirm('Вы уверены, что хотите удалить этот API ключ? Это действие необратимо.')) {
            return;
        }

        try {
            await api.delete(`/api/panel/api-keys/${keyId}`);
            fetchKeys();
            toast({
                title: 'Успех',
                description: 'API ключ удалён'
            });
        } catch (err) {
            console.error('Ошибка удаления API ключа:', err);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Скопировано',
            description: 'API ключ скопирован в буфер обмена'
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Никогда';
        return new Date(dateString).toLocaleString('ru-RU');
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">API Ключи Панели</h1>
                    <p className="text-muted-foreground mt-1">
                        Управление вашими API ключами для доступа к REST API и WebSocket панели
                    </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Создать API Ключ
                </Button>
            </div>

            <Alert>
                <AlertDescription>
                    ⚠️ <strong>Экспериментальная функция.</strong> Документация пока отсутствует.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>О API Ключах Панели</CardTitle>
                    <CardDescription>
                        API ключи панели позволяют вам получать доступ к API панели BlockMine и WebSocket для автоматизации и интеграций.
                        Ключи наследуют права вашего пользователя по умолчанию.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        <strong>Безопасность:</strong> Относитесь к API ключам как к паролям. Никогда не делитесь ими публично и не добавляйте в систему контроля версий.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ваши API Ключи</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Название</TableHead>
                                <TableHead>Префикс Ключа</TableHead>
                                <TableHead>Последнее Использование</TableHead>
                                <TableHead>Создан</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        Загрузка...
                                    </TableCell>
                                </TableRow>
                            ) : keys.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Нет API ключей. Создайте новый для начала работы.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium">{key.name}</TableCell>
                                        <TableCell>
                                            <code className="text-sm bg-muted px-2 py-1 rounded">
                                                {key.prefix}...
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(key.lastUsedAt)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(key.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={key.isActive ? "default" : "secondary"}>
                                                {key.isActive ? 'Активен' : 'Неактивен'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteKey(key.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Создать Новый API Ключ</DialogTitle>
                        <DialogDescription>
                            Выберите понятное название для вашего API ключа
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="keyName">Название Ключа</Label>
                            <Input
                                id="keyName"
                                placeholder="например, Продакшн Бот, Разработка"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleCreateKey}>Создать Ключ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>API Ключ Успешно Создан!</DialogTitle>
                        <DialogDescription>
                            Обязательно скопируйте ваш API ключ сейчас. Вы не сможете увидеть его снова!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Alert>
                            <AlertDescription className="font-semibold">
                                ⚠️ Это единственный раз, когда вы увидите этот ключ. Скопируйте его сейчас!
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>Название Ключа</Label>
                            <div className="font-semibold">{createdKey?.name}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>API Ключ</Label>
                            <div className="relative bg-muted p-4 rounded-lg">
                                <code className={`text-sm break-all ${!showCreatedKey && 'blur-sm select-none'}`}>
                                    {createdKey?.apiKey}
                                </code>
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowCreatedKey(!showCreatedKey)}
                                    >
                                        {showCreatedKey ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                        {showCreatedKey ? 'Скрыть' : 'Показать'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(createdKey?.apiKey)}
                                        disabled={!showCreatedKey}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Копировать
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Пример Использования</Label>
                            <div className="bg-muted p-4 rounded-lg">
                                <code className="text-sm">
                                    const panel = await BlockMineSDK.connectToPanel(&#123;<br />
                                    &nbsp;&nbsp;url: 'http://localhost:3000',<br />
                                    &nbsp;&nbsp;token: '{createdKey?.apiKey}'<br />
                                    &#125;);
                                </code>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setCreatedKey(null)}>
                            Я Сохранил Мой Ключ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
