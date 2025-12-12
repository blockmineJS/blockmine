import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('api-keys');
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
            console.error('Error loading API keys:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast({
                variant: 'destructive',
                title: t('messages.error'),
                description: t('messages.nameRequired')
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
                title: t('messages.success'),
                description: t('messages.createSuccess')
            });
        } catch (err) {
            console.error('Error creating API key:', err);
        }
    };

    const handleDeleteKey = async (keyId) => {
        if (!confirm(t('messages.deleteConfirm'))) {
            return;
        }

        try {
            await api.delete(`/api/panel/api-keys/${keyId}`);
            fetchKeys();
            toast({
                title: t('messages.success'),
                description: t('messages.deleteSuccess')
            });
        } catch (err) {
            console.error('Error deleting API key:', err);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: t('messages.copied'),
            description: t('messages.copiedDescription')
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('table.never');
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t('description')}
                    </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createKey')}
                </Button>
            </div>

            <Alert>
                <AlertDescription>
                    ⚠️ <strong>{t('experimental')}</strong>
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>{t('about.title')}</CardTitle>
                    <CardDescription>
                        {t('about.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        <strong>{t('about.security')}</strong>
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('table.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('table.name')}</TableHead>
                                <TableHead>{t('table.prefix')}</TableHead>
                                <TableHead>{t('table.lastUsed')}</TableHead>
                                <TableHead>{t('table.created')}</TableHead>
                                <TableHead>{t('table.status')}</TableHead>
                                <TableHead className="text-right">{t('table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        {t('table.loading')}
                                    </TableCell>
                                </TableRow>
                            ) : keys.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        {t('table.empty')}
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
                                                {key.isActive ? t('table.active') : t('table.inactive')}
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
                        <DialogTitle>{t('createDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('createDialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="keyName">{t('createDialog.nameLabel')}</Label>
                            <Input
                                id="keyName"
                                placeholder={t('createDialog.namePlaceholder')}
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            {t('createDialog.cancel')}
                        </Button>
                        <Button onClick={handleCreateKey}>{t('createDialog.create')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('createdDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('createdDialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Alert>
                            <AlertDescription className="font-semibold">
                                ⚠️ {t('createdDialog.warning')}
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>{t('createdDialog.nameLabel')}</Label>
                            <div className="font-semibold">{createdKey?.name}</div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('createdDialog.keyLabel')}</Label>
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
                                        {showCreatedKey ? t('createdDialog.hide') : t('createdDialog.show')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(createdKey?.apiKey)}
                                        disabled={!showCreatedKey}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        {t('createdDialog.copy')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('createdDialog.usage')}</Label>
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
                            {t('createdDialog.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
