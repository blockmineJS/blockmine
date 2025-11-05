import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Command, Terminal, FilePenLine, Trash2, Share2, Upload, Sparkles } from 'lucide-react';
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

    useEffect(() => {
        setLocalCommands(commands);
    }, [commands]);

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
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Команды</CardTitle>
                        <CardDescription>Список всех команд, доступных боту. Кликните на карточку для просмотра деталей и настроек.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Импорт
                        </Button>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Sparkles className="mr-2 h-4 w-4" />Создать команду
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                <Table>
                    <TableHeader>
                                                    <TableRow>
                                <TableHead className="w-[80px]">Статус</TableHead>
                                <TableHead>Команда</TableHead>
                                <TableHead>Источник</TableHead>
                                <TableHead>Плагин</TableHead>
                                <TableHead>Алиасы</TableHead>
                                <TableHead>Типы чатов</TableHead>
                                <TableHead>Право</TableHead>
                                <TableHead className="w-[100px]">Кулдаун</TableHead>
                                <TableHead>Действия</TableHead>
                            </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="text-center">Загрузка...</TableCell></TableRow>
                        ) : (
                            localCommands.map(command => (
                                <TableRow key={command.id} onClick={() => handleOpenModal(command)} className="cursor-pointer transition-colors hover:bg-muted/50">
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <Switch checked={command.isEnabled} onCheckedChange={checked => handleToggle(command, checked)} />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {command.name}
                                        <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={command.description}>
                                            {command.description}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={command.owner === OWNER_TYPES.SYSTEM ? 'secondary' : 'default'}>
                                            {command.owner ? command.owner.replace('plugin:', '') : 'system'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {command.pluginOwner ? (
                                            <Badge variant="outline" className="text-xs">
                                                {command.pluginOwner.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {Array.isArray(command.aliases) 
                                                ? command.aliases.map(alias => <Badge key={alias} variant="secondary">{alias}</Badge>)
                                                : (typeof command.aliases === 'string' 
                                                    ? JSON.parse(command.aliases || '[]').map(alias => <Badge key={alias} variant="secondary">{alias}</Badge>)
                                                    : <span className="text-muted-foreground">-</span>
                                                )
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {Array.isArray(command.allowedChatTypes) 
                                                ? command.allowedChatTypes.map(type => <Badge key={type} variant="outline">{type}</Badge>)
                                                : (typeof command.allowedChatTypes === 'string' 
                                                    ? JSON.parse(command.allowedChatTypes || '[]').map(type => <Badge key={type} variant="outline">{type}</Badge>)
                                                    : <span className="text-muted-foreground">-</span>
                                                )
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {allPermissions.find(p => p.id === command.permissionId)?.name || <span className="text-muted-foreground">Нет</span>}
                                    </TableCell>
                                    <TableCell>
                                        {command.cooldown} сек.
                                    </TableCell>
                                    <TableCell>
                                        {(command.isVisual || (command.graphJson && command.graphJson !== 'null')) ? (
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); navigate(`/bots/${botId}/commands/visual/${command.id}`); }} className="transition-colors hover:bg-accent">
                                                    <FilePenLine className="h-4 w-4 mr-1" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Экспорт" onClick={e => { e.stopPropagation(); setCommandToShare(command); }} className="transition-colors hover:bg-accent">
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Удалить" onClick={e => { e.stopPropagation(); setCommandToDelete(command); setIsDeleteDialogOpen(true); }} className="transition-colors hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
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
    );
}