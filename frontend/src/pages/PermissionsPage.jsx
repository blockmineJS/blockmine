import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import GroupFormDialog from '@/components/GroupFormDialog';
import { apiHelper } from '@/lib/api';

function GroupsManager({ allPermissions, onDataChange, t }) {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiHelper('/api/permissions/groups');
            setGroups(data);
        } catch (error) {
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

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
        const url = isEdit ? `/api/permissions/groups/${editingGroup.id}` : '/api/permissions/groups';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            await apiHelper(url, {
                method,
                body: JSON.stringify(groupData),
            }, t(isEdit ? 'groups.messages.updated' : 'groups.messages.created'));

            handleCloseModal();
            fetchGroups();
            onDataChange();
        } catch (error) {
        }
        setIsSaving(false);
    };

    const handleDelete = async (group) => {
        if (group.owner === 'system') {
            toast({ variant: "destructive", title: t('common.error'), description: t('groups.messages.systemDelete') });
            return;
        }
        if (window.confirm(t('groups.messages.confirmDelete', { name: group.name }))) {
            try {
                await apiHelper(`/api/permissions/groups/${group.id}`, { method: 'DELETE' }, t('groups.messages.deleted'));
                fetchGroups();
                onDataChange();
            } catch (error) {
            }
        }
    };
    
    return (
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
                                    <TableCell className="font-medium">{group.name} {group.owner === 'system' && <Badge variant="secondary">System</Badge>}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {group.permissions.map(p => <Badge key={p.permission.id} variant="outline">{p.permission.name}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(group)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" disabled={group.owner === 'system'} onClick={() => handleDelete(group)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function PermissionsManager({ allPermissions, isLoading, t }) {
     return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>{t('permissions.title')}</CardTitle>
                <CardDescription>{t('permissions.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('permissions.table.permission')}</TableHead>
                            <TableHead>{t('permissions.table.description')}</TableHead>
                            <TableHead>{t('permissions.table.source')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                             <TableRow><TableCell colSpan={3} className="text-center">{t('permissions.table.loading')}</TableCell></TableRow>
                        ) : (
                            allPermissions.map(perm => (
                                <TableRow key={perm.id}>
                                    <TableCell className="font-mono">{perm.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{perm.description}</TableCell>
                                    <TableCell><Badge variant={perm.owner === 'system' ? 'secondary' : 'default'}>{perm.owner}</Badge></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function PermissionsPage() {
    const { t } = useTranslation('permissions');
    const [allPermissions, setAllPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllPermissions = useCallback(async () => {
        setIsLoading(true);
         try {
            const data = await apiHelper('/api/permissions/all');
            setAllPermissions(data);
        } catch (error) {
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAllPermissions();
    }, [fetchAllPermissions]);

    return (
        <div className="h-full flex flex-col p-4">
            <CardHeader className="px-0">
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                    {t('description')}
                </CardDescription>
            </CardHeader>
            <Tabs defaultValue="groups" className="flex-grow flex flex-col">
                <TabsList>
                    <TabsTrigger value="groups">{t('tabs.groups')}</TabsTrigger>
                    <TabsTrigger value="permissions">{t('tabs.permissions')}</TabsTrigger>
                </TabsList>
                <TabsContent value="groups" className="flex-grow mt-4">
                    <GroupsManager allPermissions={allPermissions} onDataChange={fetchAllPermissions} t={t} />
                </TabsContent>
                <TabsContent value="permissions" className="flex-grow mt-4">
                    <PermissionsManager allPermissions={allPermissions} isLoading={isLoading} t={t} />
                </TabsContent>
            </Tabs>
        </div>
    );
}