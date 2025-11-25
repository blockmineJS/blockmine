import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { FilePenLine, Trash2, Share2, Upload, Sparkles, Search, AlertTriangle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import CommandDetailDialog from './CommandDetailDialog';
import { CreateCommandDialog } from './CreateCommandDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { apiHelper } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import ShareCommandDialog from '../ShareCommandDialog';
import ImportCommandDialog from '../ImportCommandDialog';

const OWNER_TYPES = {
  SYSTEM: 'system'
};

export default function CommandsManager({ commands = [], allPermissions = [], botId, isLoading, onDataChange }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCommand, setEditingCommand] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [commandToDelete, setCommandToDelete] = useState(null);
    const [commandToShare, setCommandToShare] = useState(null);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [localCommands, setLocalCommands] = useState(commands);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLocalCommands(commands);
    }, [commands]);

    // Filtered commands
    const filteredCommands = useMemo(() => {
        if (!searchQuery) return localCommands;

        return localCommands.filter(cmd =>
            cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cmd.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [localCommands, searchQuery]);

    // Quick stats
    const stats = useMemo(() => {
        return {
            total: localCommands.length,
            active: localCommands.filter(c => c.isEnabled).length
        };
    }, [localCommands]);

    const handleOpenModal = (command) => {
        if (command.isVisual || (command.graphJson && command.graphJson !== 'null')) {
            navigate(`/bots/${botId}/commands/visual/${command.id}`);
            return;
        }
        setEditingCommand(command);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCommand(null);
    };

    const handleCreateCommand = async (commandData) => {
        try {
            const newCommand = await apiHelper(`/api/bots/${botId}/commands`, {
                method: 'POST',
                body: JSON.stringify({ ...commandData, isVisual: true }),
            });
            toast({ title: 'Успех', description: `Команда "${newCommand.name}" успешно создана.` });
            onDataChange();
            setIsCreateDialogOpen(false);
      navigate(`/bots/${botId}/commands/visual/${newCommand.id}`);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось создать команду: ${error.message}` });
        }
    };

    const handleDeleteCommand = async () => {
        if (!commandToDelete) return;
        try {
            await apiHelper(`/api/bots/${botId}/commands/${commandToDelete.id}`, { method: 'DELETE' });
            toast({ title: 'Успех', description: `Команда "${commandToDelete.name}" удалена.` });
            onDataChange();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: `Не удалось удалить команду: ${error.message}` });
        }
        setIsDeleteDialogOpen(false);
        setCommandToDelete(null);
    };

    const updateCommand = async (commandId, data, skipDataChange = false) => {
        try {
            await apiHelper(`/api/bots/${botId}/commands/${commandId}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            if (!skipDataChange) {
                onDataChange();
            }
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleToggle = async (command, isEnabled) => {
        setLocalCommands(prevCommands =>
            prevCommands.map(cmd =>
                cmd.id === command.id ? { ...cmd, isEnabled } : cmd
            )
        );

        const success = await updateCommand(command.id, { isEnabled }, true);
        if (success) {
            toast({ title: "Успех!", description: `Команда "${command.name}" была ${isEnabled ? 'включена' : 'выключена'}.` });
        } else {
            setLocalCommands(prevCommands =>
                prevCommands.map(cmd =>
                    cmd.id === command.id ? { ...cmd, isEnabled: !isEnabled } : cmd
                )
            );
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось изменить статус команды.' });
        }
    };

    const handleSubmit = async (commandData) => {
        if (!editingCommand) return;
        setIsSaving(true);
        const success = await updateCommand(editingCommand.id, commandData);
        if (success) {
            toast({ title: "Успех!", description: `Настройки команды ${editingCommand.name} обновлены.` });
            handleCloseModal();
        }
        setIsSaving(false);
    };

    return (
        <TooltipProvider>
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <div className="flex items-baseline gap-3 mb-1">
                            <CardTitle className="text-2xl font-bold tracking-tight">Команды</CardTitle>
                            <span className="text-sm text-muted-foreground">
                                {stats.active} из {stats.total} активно
                            </span>
                        </div>
                        <CardDescription>Список всех команд, доступных боту</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Импорт
                        </Button>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Sparkles className="mr-2 h-4 w-4" />Создать
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск по названию или описанию..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </CardHeader>

            <CardContent className="flex-grow overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">Вкл</TableHead>
                            <TableHead>Команда</TableHead>
                            <TableHead>Тип</TableHead>
                            <TableHead>Источник</TableHead>
                            <TableHead>Алиасы</TableHead>
                            <TableHead>Право</TableHead>
                            <TableHead className="w-[80px]">CD</TableHead>
                            <TableHead className="text-right w-[140px]">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} className="text-center">Загрузка...</TableCell></TableRow>
                        ) : filteredCommands.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">
                                {searchQuery ? 'Команды не найдены' : 'Нет команд'}
                            </TableCell></TableRow>
                        ) : (
                            filteredCommands.map(command => (
                                <TableRow key={command.id} onClick={() => handleOpenModal(command)} className="cursor-pointer transition-colors hover:bg-muted/50">
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <Switch checked={command.isEnabled} onCheckedChange={checked => handleToggle(command, checked)} />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {command.name}
                                        {command.description && (
                                            <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={command.description}>
                                                {command.description}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={(command.isVisual || (command.graphJson && command.graphJson !== 'null')) ? 'default' : 'secondary'}>
                                            {(command.isVisual || (command.graphJson && command.graphJson !== 'null')) ? 'Visual' : 'Code'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={command.owner === OWNER_TYPES.SYSTEM ? 'secondary' : 'outline'} className="text-xs">
                                            {command.owner ? command.owner.replace('plugin:', '') : 'system'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                                            {Array.isArray(command.aliases) && command.aliases.length > 0
                                                ? command.aliases.slice(0, 2).map(alias => <Badge key={alias} variant="secondary" className="text-xs">{alias}</Badge>)
                                                : <span className="text-muted-foreground text-xs">-</span>
                                            }
                                            {Array.isArray(command.aliases) && command.aliases.length > 2 && (
                                                <span className="text-xs text-muted-foreground">+{command.aliases.length - 2}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {command.permissionId ? (
                                            allPermissions.find(p => p.id === command.permissionId)?.name || '-'
                                        ) : (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 cursor-help">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        <span>Нет</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Эту команду смогут использовать все</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {command.cooldown}s
                                    </TableCell>
                                    <TableCell>
                                        {(command.isVisual || (command.graphJson && command.graphJson !== 'null')) ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); navigate(`/bots/${botId}/commands/visual/${command.id}`); }}>
                                                    <FilePenLine className="h-3 w-3 mr-1" />
                                                    Открыть
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Экспорт" onClick={e => { e.stopPropagation(); setCommandToShare(command); }}>
                                                    <Share2 className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" title="Удалить" onClick={e => { e.stopPropagation(); setCommandToDelete(command); setIsDeleteDialogOpen(true); }}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <CommandDetailDialog
                    onCancel={handleCloseModal}
                    command={editingCommand}
                    allPermissions={allPermissions}
                    onSubmit={handleSubmit}
                    isSaving={isSaving}
                />
            </Dialog>

            <ImportCommandDialog
                botId={botId}
                open={isImportDialogOpen}
                onOpenChange={setIsImportDialogOpen}
                onImportSuccess={() => {
                    setIsImportDialogOpen(false);
                    onDataChange();
                }}
            />

            {commandToShare && (
                <ShareCommandDialog
                    botId={botId}
                    commandId={commandToShare.id}
                    onCancel={() => setCommandToShare(null)}
                />
            )}

            <CreateCommandDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onCreate={handleCreateCommand} />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы действительно хотите удалить команду "{commandToDelete?.name}"? Это действие нельзя будет отменить.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCommand}>Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
        </TooltipProvider>
    );
}
