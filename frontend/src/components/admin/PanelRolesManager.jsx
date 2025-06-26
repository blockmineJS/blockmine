import React, { useState, useEffect, useCallback } from 'react';
import { apiHelper } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import RoleFormDialog from './RoleFormDialog';
import ConfirmationDialog from '../ConfirmationDialog';
import { useToast } from '@/hooks/use-toast';

export default function PanelRolesManager() {
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [rolesData, permsData] = await Promise.all([
                apiHelper('/api/auth/roles'),
                apiHelper('/api/auth/permissions')
            ]);
            setRoles(rolesData);
            setAllPermissions(permsData);
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

    const handleOpenModal = (role = null) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRole(null);
    };

    const handleSubmit = async (roleData, roleId) => {
        setIsSaving(true);
        const isEdit = !!roleId;
        const url = isEdit ? `/api/auth/roles/${roleId}` : '/api/auth/roles';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            await apiHelper(url, { method, body: JSON.stringify(roleData) }, `Роль успешно ${isEdit ? 'обновлена' : 'создана'}.`);
            handleCloseModal();
            fetchData();
        } catch (err) { } 
        finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!roleToDelete) return;
        try {
            await apiHelper(`/api/auth/roles/${roleToDelete.id}`, { method: 'DELETE' }, 'Роль удалена.');
            setRoleToDelete(null);
            fetchData();
        } catch (err) { }
    };

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Роли панели</CardTitle>
                            <CardDescription>Управление ролями и наборами их прав.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4" />Создать роль</Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Название</TableHead><TableHead>Права</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : (
                                roles.map(role => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell className="max-w-md">
                                            <div className="flex flex-wrap gap-1">
                                                {role.permissions.includes('*') ? <Badge>Все права</Badge> : role.permissions.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(role)} disabled={role.name === 'Admin'}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setRoleToDelete(role)} disabled={role.name === 'Admin'}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
                <RoleFormDialog 
                    role={editingRole} 
                    allPermissions={allPermissions}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseModal}
                    isSaving={isSaving}
                />
            </Dialog>

            <ConfirmationDialog 
                open={!!roleToDelete}
                onOpenChange={() => setRoleToDelete(null)}
                title={`Удалить роль "${roleToDelete?.name}"?`}
                description="Это действие необратимо. Убедитесь, что эта роль не назначена ни одному пользователю."
                onConfirm={handleDelete}
                confirmText="Да, удалить"
            />
        </>
    );
}