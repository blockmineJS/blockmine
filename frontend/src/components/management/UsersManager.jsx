import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Edit, ArrowUpDown } from 'lucide-react';
import UserEditDialog from './UserEditDialog';
import { apiHelper } from '@/lib/api';

export default function UsersManager({ users, groups, botId, isLoading, onDataChange }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'ascending' });

    const sortedUsers = useMemo(() => {
        let sortableUsers = [...users];
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
                <CardTitle>Пользователи</CardTitle>
                <CardDescription>Список всех пользователей, которые взаимодействовали с ботом.</CardDescription>
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