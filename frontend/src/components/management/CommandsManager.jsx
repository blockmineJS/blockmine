
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';
import CommandEditDialog from './CommandEditDialog';

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
                <CardDescription>Список всех команд, доступных боту. Управляйте их состоянием и настройками.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Статус</TableHead>
                            <TableHead>Команда</TableHead>
                            <TableHead>Алиасы</TableHead>
                            <TableHead>Типы чатов</TableHead>
                            <TableHead>Право</TableHead>
                            <TableHead className="w-[100px]">Кулдаун</TableHead>
                            <TableHead className="text-right w-[100px]">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center">Загрузка...</TableCell></TableRow>
                        ) : (
                            commands.map(command => {
                                let aliases = [];
                                let allowedTypes = [];

                                try {
                                    aliases = Array.isArray(command.aliases) 
                                        ? command.aliases 
                                        : JSON.parse(command.aliases || '[]');
                                } catch (e) {
                                    console.error(`Ошибка парсинга aliases для команды ${command.name}:`, command.aliases);
                                }

                                try {
                                    allowedTypes = Array.isArray(command.allowedChatTypes) 
                                        ? command.allowedChatTypes 
                                        : JSON.parse(command.allowedChatTypes || '[]');
                                } catch (e) {
                                    console.error(`Ошибка парсинга allowedChatTypes для команды ${command.name}:`, command.allowedChatTypes);
                                }

                                return (
                                    <TableRow key={command.id}>
                                        <TableCell>
                                            <Switch checked={command.isEnabled} onCheckedChange={(checked) => handleToggle(command, checked)} />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {command.name}
                                            <div className="text-xs text-muted-foreground max-w-[250px] truncate" title={command.description}>
                                                {command.description}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono pt-1">{command.owner}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {aliases.map(alias => <Badge key={alias} variant="secondary">{alias}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {allowedTypes.map(type => <Badge key={type} variant="outline">{type}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {allPermissions.find(p => p.id === command.permissionId)?.name || <span className="text-muted-foreground">Нет</span>}
                                        </TableCell>
                                        <TableCell>
                                            {command.cooldown} сек.
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(command)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                {editingCommand && (
                    <CommandEditDialog 
                        command={editingCommand}
                        allPermissions={allPermissions}
                        onSubmit={handleSubmit}
                        onCancel={handleCloseModal}
                        isSaving={isSaving}
                    />
                )}
            </Dialog>
        </Card>
    );
}