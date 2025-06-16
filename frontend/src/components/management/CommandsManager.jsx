
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import CommandDetailDialog from './CommandDetailDialog';

/**
 * Типы владельцев команд, используемые для различения системных команд и команд от плагинов.
 * Системные команды могут иметь особую обработку в UI.
 */
const OWNER_TYPES = {
  SYSTEM: 'system'
};

export default function CommandsManager({ commands = [], allPermissions = [], botId, isLoading, onDataChange }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCommand, setEditingCommand] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleOpenModal = (command) => {
        setEditingCommand(command);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCommand(null);
    };

    const updateCommand = async (commandId, data) => {
        const url = `/api/bots/${botId}/commands/${commandId}`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server Error');
            onDataChange();
            return true;
        } catch (error) {
            toast({ variant: "destructive", title: "Ошибка", description: error.message });
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
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Команды</CardTitle>
                <CardDescription>Список всех команд, доступных боту. Кликните на строку для просмотра деталей и настроек.</CardDescription>
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center">Загрузка...</TableCell></TableRow>
                        ) : (
                            commands.map(command => (
                                <TableRow key={command.id} onClick={() => handleOpenModal(command)} className="cursor-pointer">
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Switch checked={command.isEnabled} onCheckedChange={(checked) => handleToggle(command, checked)} />
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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <CommandDetailDialog
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    command={editingCommand}
                    allPermissions={allPermissions}
                    onSubmit={handleSubmit}
                    isSaving={isSaving}
                />
            </Dialog>
        </Card>
    );
}