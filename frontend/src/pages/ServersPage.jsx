import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import ServerForm from '@/components/ServerForm';
import { useAppStore } from '@/stores/appStore';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { apiHelper } from '@/lib/api';

export default function ServersPage() {
    const servers = useAppStore((state) => state.servers);
    const fetchInitialData = useAppStore((state) => state.fetchInitialData);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingServer, setEditingServer] = useState(null);
    const [serverToDelete, setServerToDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const hasData = servers && servers.length > 0;
        if (hasData) {
            setIsLoading(false);
        } else {
            const timer = setTimeout(() => {
                const currentServers = useAppStore.getState().servers;
                if (!currentServers || currentServers.length === 0) {
                    setIsLoading(false);
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [servers]);

    const handleOpenModal = (server = null) => {
        setEditingServer(server);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingServer(null);
    };

    const handleSubmit = async (serverData) => {
        setIsSaving(true);
        const isEdit = !!editingServer;
        const url = isEdit ? `/api/servers/${editingServer.id}` : '/api/servers';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            await apiHelper(url, {
                method,
                body: JSON.stringify(serverData),
            }, `Сервер успешно ${isEdit ? 'обновлен' : 'создан'}.`);
            
            handleCloseModal();
            await fetchInitialData();
        } catch (error) {
        }
        setIsSaving(false);
    };

    const handleConfirmDelete = async () => {
        if (!serverToDelete) return;
        try {
            await apiHelper(`/api/servers/${serverToDelete.id}`, { method: 'DELETE' }, "Сервер удален.");
            await fetchInitialData();
        } catch (error) {
        }
    };
    
    return (
        <>
            <div className="p-4 h-full">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Управление серверами</CardTitle>
                            <CardDescription>Добавляйте и редактируйте серверы, к которым будут подключаться боты.</CardDescription>
                        </div>
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenModal()}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Добавить сервер
                                </Button>
                            </DialogTrigger>
                            <ServerForm server={editingServer} onSubmit={handleSubmit} onCancel={handleCloseModal} isSaving={isSaving} />
                        </Dialog>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Название</TableHead>
                                    <TableHead>Адрес</TableHead>
                                    <TableHead>Версия</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            <div className="flex justify-center items-center">
                                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                                Загрузка серверов...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : servers.length > 0 ? (
                                    servers.map(server => (
                                        <TableRow key={server.id}>
                                            <TableCell className="font-medium">{server.name}</TableCell>
                                            <TableCell>{server.host}:{server.port}</TableCell>
                                            <TableCell>{server.version}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(server)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setServerToDelete(server)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            Серверы не найдены. Добавьте свой первый сервер.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            {serverToDelete && (
                 <ConfirmationDialog
                    open={!!serverToDelete}
                    onOpenChange={() => setServerToDelete(null)}
                    title={`Удалить сервер "${serverToDelete.name}"?`}
                    description="Это действие необратимо. Если к этому серверу привязаны боты, вы не сможете его удалить."
                    onConfirm={handleConfirmDelete}
                    confirmText="Да, удалить"
                />
            )}
        </>
    );
}