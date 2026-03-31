import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import GroupFormDialog from '@/components/GroupFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { apiHelper } from '@/lib/api';

export default function GroupsManager({ groups, allPermissions, botId, isLoading, onDataChange }) {
    const { t } = useTranslation('management');
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
            toast({ variant: "destructive", title: t('messages.criticalError'), description: t('groups.errors.missingBotId') });
            setIsSaving(false);
            return;
        }

        const url = isEdit ? `/api/bots/${botId}/groups/${editingGroup.id}` : `/api/bots/${botId}/groups`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            await apiHelper(url, {
                method,
                body: JSON.stringify(groupData),
            }, t('groups.toast.saved', { action: isEdit ? t('groups.actions.updated') : t('groups.actions.created') }));
            handleCloseModal();
            onDataChange();
        } catch (error) {
        }
        setIsSaving(false);
    };

    const confirmDelete = async () => {
        if (!groupToDelete) return;
        try {
            await apiHelper(`/api/bots/${groupToDelete.botId}/groups/${groupToDelete.id}`, { method: 'DELETE' }, t('groups.toast.deleted'));
            onDataChange();
        } catch (error) {
        }
    };

    const handleDeleteClick = (group) => {
        if (group.owner !== 'admin') {
            toast({ variant: "destructive", title: t('messages.error'), description: t('groups.errors.deleteSource', { owner: group.owner }) });
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
                            <CardTitle>{t('groups.title')}</CardTitle>
                            <CardDescription>{t('groups.description')}</CardDescription>
                        </div>
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                 <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4"/>{t('groups.create')}</Button>
                            </DialogTrigger>
                            <GroupFormDialog group={editingGroup} allPermissions={allPermissions} onSubmit={handleSubmit} onCancel={handleCloseModal} isSaving={isSaving} />
                        </Dialog>
                     </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('groups.table.name')}</TableHead>
                                <TableHead>{t('groups.table.permissions')}</TableHead>
                                <TableHead className="text-right">{t('groups.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center">{t('groups.table.loading')}</TableCell></TableRow>
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
                    title={t('groups.deleteDialog.title', { name: groupToDelete.name })}
                    description={t('groups.deleteDialog.description')}
                    onConfirm={confirmDelete}
                    confirmText={t('groups.deleteDialog.confirm')}
                />
            )}
        </>
    );
}
