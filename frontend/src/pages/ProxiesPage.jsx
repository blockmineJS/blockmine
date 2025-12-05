import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import ProxyForm from '@/components/ProxyForm';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { apiHelper } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProxiesPage() {
    const [proxies, setProxies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProxy, setEditingProxy] = useState(null);
    const [proxyToDelete, setProxyToDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchProxies = async () => {
        setIsLoading(true);
        try {
            const data = await apiHelper('/api/proxies');
            setProxies(data.items || []);
        } catch (error) {
            console.error('Ошибка загрузки прокси:', error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchProxies();
    }, []);

    const handleOpenModal = (proxy = null) => {
        setEditingProxy(proxy);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProxy(null);
    };

    const handleSubmit = async (proxyData) => {
        setIsSaving(true);
        const isEdit = !!editingProxy;
        const url = isEdit ? `/api/proxies/${editingProxy.id}` : '/api/proxies';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            await apiHelper(url, {
                method,
                body: JSON.stringify(proxyData),
            }, `Прокси успешно ${isEdit ? 'обновлен' : 'создан'}.`);

            handleCloseModal();
            await fetchProxies();
        } catch (error) {
        }
        setIsSaving(false);
    };

    const handleConfirmDelete = async () => {
        if (!proxyToDelete) return;
        try {
            await apiHelper(`/api/proxies/${proxyToDelete.id}`, { method: 'DELETE' }, "Прокси удален.");
            await fetchProxies();
        } catch (error) {
        }
    };

    return (
        <>
            <div className="p-4 h-full">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Управление прокси</CardTitle>
                            <CardDescription>Добавляйте и редактируйте прокси-серверы для подключения ботов.</CardDescription>
                        </div>
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenModal()}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Добавить прокси
                                </Button>
                            </DialogTrigger>
                            <ProxyForm proxy={editingProxy} onSubmit={handleSubmit} onCancel={handleCloseModal} isSaving={isSaving} />
                        </Dialog>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Название</TableHead>
                                    <TableHead>Тип</TableHead>
                                    <TableHead>Адрес</TableHead>
                                    <TableHead>Боты</TableHead>
                                    <TableHead>Заметка</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-8 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full max-w-xs" /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Skeleton className="h-8 w-8" />
                                                    <Skeleton className="h-8 w-8" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : proxies.length > 0 ? (
                                    proxies.map(proxy => (
                                        <TableRow key={proxy.id}>
                                            <TableCell className="font-medium">{proxy.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={proxy.type === 'socks5' ? 'default' : 'secondary'}>
                                                    {proxy.type?.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{proxy.host}:{proxy.port}</TableCell>
                                            <TableCell>
                                                {proxy._count?.bots > 0 ? (
                                                    <Badge variant="secondary">{proxy._count.bots}</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate text-muted-foreground">
                                                {proxy.note || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(proxy)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setProxyToDelete(proxy)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            Прокси не найдены. Добавьте свой первый прокси.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {proxyToDelete && (
                 <ConfirmationDialog
                    open={!!proxyToDelete}
                    onOpenChange={() => setProxyToDelete(null)}
                    title={`Удалить прокси "${proxyToDelete.name}"?`}
                    description="Это действие необратимо. Если этот прокси используется ботами, вы не сможете его удалить."
                    onConfirm={handleConfirmDelete}
                    confirmText="Да, удалить"
                />
            )}
        </>
    );
}
