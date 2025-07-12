import React, { useState } from 'react';
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

    const handleOpenModal = (command) => {
        if (command.isVisual) {
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

    const updateCommand = async (commandId, data) => {
        try {
            await apiHelper(`/api/bots/${botId}/commands/${commandId}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            onDataChange();
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleToggle = async (command, isEnabled) => {
        const success = await updateCommand(command.id, { isEnabled });
        if (success) {
            toast({ title: "Успех!", description: `Команда "${command.name}" была ${isEnabled ? 'включена' : 'выключена'}.` });
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
        <Card className="h-full flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur-sm opacity-20" />
                            <div className="relative bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
                                <Terminal className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Команды</CardTitle>
                            <CardDescription>Список всех команд, доступных боту. Кликните на карточку для просмотра деталей и настроек.</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Импорт
                        </Button>
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow hover:from-green-600 hover:to-emerald-600">
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
                            <TableHead>Алиасы</TableHead>
                            <TableHead>Типы чатов</TableHead>
                            <TableHead>Право</TableHead>
                            <TableHead className="w-[100px]">Кулдаун</TableHead>
                            <TableHead>Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} className="text-center">Загрузка...</TableCell></TableRow>
                        ) : (
                            commands.map(command => (
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
                                            {command.owner.replace('plugin:', '')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {command.aliases.map(alias => <Badge key={alias} variant="secondary">{alias}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {command.allowedChatTypes.map(type => <Badge key={type} variant="outline">{type}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {allPermissions.find(p => p.id === command.permissionId)?.name || <span className="text-muted-foreground">Нет</span>}
                                    </TableCell>
                                    <TableCell>
                                        {command.cooldown} сек.
                                    </TableCell>
                                    <TableCell>
                                        {command.isVisual ? (
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