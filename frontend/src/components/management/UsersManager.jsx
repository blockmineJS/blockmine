import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog } from "@/components/ui/dialog";
import { Edit, ArrowUpDown, Search } from 'lucide-react';
import UserEditDialog from './UserEditDialog';
import { apiHelper } from '@/lib/api';
import { Input } from '@/components/ui/input';

export default function UsersManager({
    users,
    pagination,
    onPageChange,
    groups,
    botId,
    isLoading,
    onDataChange,
    searchQuery,
    onSearchQueryChange,
    sortConfig,
    onSortChange
}) {
    const { t } = useTranslation('management');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onSortChange({ key, direction });
    };

    const handleOpenModal = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = async (userData) => {
        if (!editingUser) return;
        setIsSaving(true);
        try {
            await apiHelper(`/api/bots/${botId}/users/${editingUser.username}`, {
                method: 'PUT',
                body: JSON.stringify(userData),
            }, t('users.toast.updated', { name: editingUser.username }));
            
            handleCloseModal();
            onDataChange();
        } catch (error) {
        }
        setIsSaving(false);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                <CardTitle>{t('users.title')}</CardTitle>
                <CardDescription>{t('users.description')}</CardDescription>
                    </div>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder={t('users.searchPlaceholder')} 
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => onSearchQueryChange(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('username')}>
                                    {t('users.table.username')}
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('groups')}>
                                    {t('users.table.groups')}
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('isBlacklisted')}>
                                    {t('users.table.status')}
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">{t('users.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center">{t('users.table.loading')}</TableCell></TableRow>
                        ) : (
                            (users || []).map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {user.groups.map(g => <Badge key={g.groupId} variant="secondary">{g.group.name}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.isBlacklisted && <Badge variant="destructive">{t('users.blacklisted')}</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(user)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            {pagination && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                        {t('users.pagination.showing', {
                            from: ((pagination.page - 1) * pagination.pageSize) + 1,
                            to: Math.min(pagination.page * pagination.pageSize, pagination.total),
                            total: pagination.total,
                        })}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1 || isLoading}
                        >
                            {t('users.pagination.previous')}
                        </Button>
                        <span className="text-sm">
                            {t('users.pagination.page', { page: pagination.page, totalPages: pagination.totalPages })}
                        </span>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages || isLoading}
                        >
                            {t('users.pagination.next')}
                        </Button>
                    </div>
                </div>
            )}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <UserEditDialog 
                    user={editingUser}
                    allGroups={groups}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseModal}
                    isSaving={isSaving}
                />
            </Dialog>
        </Card>
    );
}
