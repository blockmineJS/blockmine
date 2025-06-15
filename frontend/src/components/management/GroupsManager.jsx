import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import GroupFormDialog from '@/components/GroupFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';

export default function GroupsManager({ groups, allPermissions, botId, isLoading, onDataChange }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleOpenModal = (group = null) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingGroup(null);
    };

    const handleSubmit = async (groupData) => {
        setIsSaving(true);
        const isEdit = !!editingGroup;
        
        if (!botId) {
            toast({ variant: "destructive", title: "Критическая ошибка", description: "Не удалось определить ID бота." });
            setIsSaving(false);
            return;
        }

        const url = isEdit ? `/api/bots/${botId}/groups/${editingGroup.id}` : `/api/bots/${botId}/groups`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupData),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server Error');
            toast({ title: "Успех!", description: `Группа успешно ${isEdit ? 'обновлена' : 'создана'}.` });
            handleCloseModal();
            onDataChange();
        } catch (error) {
            toast({ variant: "destructive", title: "Ошибка", description: error.message });
        }
        setIsSaving(false);
    };

    const confirmDelete = async () => {
        if (!groupToDelete) return;
        try {
            const response = await fetch(`/api/bots/${groupToDelete.botId}/groups/${groupToDelete.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error((await response.json()).error || 'Server Error');
            toast({ title: "Успех!", description: "Группа удалена." });
            onDataChange();
        } catch (error) {
            toast({ variant: "destructive", title: "Ошибка", description: error.message });
        }
    };

    const handleDeleteClick = (group) => {
        if (group.owner !== 'admin') {
            toast({ variant: "destructive", title: "Ошибка", description: `Нельзя удалить группу с источником "${group.owner}".` });
            return;
        }
        setGroupToDelete(group);
    };
    
    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Группы</CardTitle>
                            <CardDescription>Список всех групп и их прав для этого бота.</CardDescription>
                        </div>
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                 <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4"/>Создать группу</Button>
                            </DialogTrigger>
                            <GroupFormDialog group={editingGroup} allPermissions={allPermissions} onSubmit={handleSubmit} onCancel={handleCloseModal} isSaving={isSaving} />
                        </Dialog>
                     </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Название</TableHead>
                                <TableHead>Права</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center">Загрузка...</TableCell></TableRow>
                            ) : (
                                groups.map(group => (
                                    <TableRow key={group.id}>
                                        <TableCell className="font-medium">{group.name} {group.owner !== 'admin' && <Badge variant="secondary">{group.owner}</Badge>}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {group.permissions.map(p => <Badge key={p.permission.id} variant="outline">{p.permission.name}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(group)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" disabled={group.owner !== 'admin'} onClick={() => handleDeleteClick(group)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {groupToDelete && (
                <ConfirmationDialog
                    open={!!groupToDelete}
                    onOpenChange={() => setGroupToDelete(null)}
                    title={`Удалить группу "${groupToDelete.name}"?`}
                    description="Это действие нельзя будет отменить. Пользователи, состоявшие в этой группе, потеряют соответствующие права."
                    onConfirm={confirmDelete}
                    confirmText="Да, удалить группу"
                />
            )}
        </>
    );
}