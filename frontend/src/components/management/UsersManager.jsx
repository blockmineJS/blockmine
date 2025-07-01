import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
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
    onSearchQueryChange 
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'ascending' });

    const sortedUsers = useMemo(() => {
        let sortableUsers = [...(users || [])];
        if (sortConfig.key) {
            sortableUsers.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'groups') {
                    aValue = a.groups.length;
                    bValue = b.groups.length;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableUsers;
    }, [users, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
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
            await apiHelper(`/api/bots/${botId}/users/${editingUser.id}`, {
                method: 'PUT',
                body: JSON.stringify(userData),
            }, `Данные пользователя ${editingUser.username} обновлены.`);
            
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
                <CardTitle>Пользователи</CardTitle>
                <CardDescription>Список всех пользователей, которые взаимодействовали с ботом.</CardDescription>
                    </div>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Поиск по никнейму..." 
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
                                    Никнейм
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('groups')}>
                                    Группы
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('isBlacklisted')}>
                                    Статус
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center">Загрузка...</TableCell></TableRow>
                        ) : (
                            sortedUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {user.groups.map(g => <Badge key={g.groupId} variant="secondary">{g.group.name}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.isBlacklisted && <Badge variant="destructive">В черном списке</Badge>}
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
                        Показано {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} из {pagination.total} пользователей
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1 || isLoading}
                        >
                            Назад
                        </Button>
                        <span className="text-sm">
                            Страница {pagination.page} из {pagination.totalPages}
                        </span>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages || isLoading}
                        >
                            Вперед
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