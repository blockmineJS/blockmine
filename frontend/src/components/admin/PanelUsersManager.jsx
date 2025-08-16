import React, { useState, useEffect, useCallback } from 'react';
import { apiHelper } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import UserFormDialog from './UserFormDialog';
import ConfirmationDialog from '../ConfirmationDialog';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';

export default function PanelUsersManager() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    
    const { toast } = useToast();
    const currentUser = useAppStore(state => state.user);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                apiHelper('/api/auth/users'),
                apiHelper('/api/auth/roles')
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить данные.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (user = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = async (formData, userId) => {
        setIsSaving(true);
        try {
            if (userId) {
                const updated = await apiHelper(`/api/auth/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
                toast({ title: 'Успешно', description: 'Пользователь обновлен.' });
            } else {
                const created = await apiHelper('/api/auth/users', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                setUsers(prev => [...prev, created]);
                toast({ title: 'Успешно', description: 'Пользователь создан.' });
            }
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить пользователя.' });
        } finally {
            setIsSaving(false);
            handleCloseModal();
        }
    };
    
    const handleDelete = async () => {
        if (!userToDelete) return;

        try {
            await apiHelper(`/api/auth/users/${userToDelete.id}`, { method: 'DELETE' }, 'Пользователь удален.');
            setUserToDelete(null);
            fetchData();
        } catch (err) {
        }
    };

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Пользователи панели</CardTitle>
                            <CardDescription>Управление учетными записями и их ролями.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4" />Создать пользователя</Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Имя</TableHead><TableHead>Роль</TableHead><TableHead>Доступ к ботам</TableHead><TableHead>Дата создания</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : (
                                users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.role.name}</TableCell>
                                        <TableCell>{user.allBots ? 'Все боты' : `Выбрано: ${user.botAccess?.length || 0}`}</TableCell>
                                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(user)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={user.id === currentUser.id}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <UserFormDialog 
                    user={editingUser} 
                    roles={roles}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseModal}
                    isSaving={isSaving}
                />
            </Dialog>

            <ConfirmationDialog 
                open={!!userToDelete}
                onOpenChange={() => setUserToDelete(null)}
                title={`Удалить пользователя "${userToDelete?.username}"?`}
                description="Это действие необратимо."
                onConfirm={handleDelete}
                confirmText="Да, удалить"
            />
        </>
    );
}