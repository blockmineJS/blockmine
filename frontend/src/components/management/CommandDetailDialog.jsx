
import React, { useState, useEffect } from 'react';
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DynamicInputList from './DynamicInputList';
import { Save, Loader2 } from 'lucide-react';

/**
 * Типы владельцев команд, используемые для различения системных команд и команд от плагинов.
 */
const OWNER_TYPES = {
  SYSTEM: 'system'
};

function CommandOverviewTab({ command }) {
    const usageString = `@${command.name} ${command.args?.map(arg => arg.required ? `<${arg.name}>` : `[${arg.name}]`).join(' ') || ''}`;
    
    const ownerName = command.owner ? command.owner.replace('plugin:', '') : '';

    return (
        <div className="space-y-6">
            <div>
                <Label>Использование</Label>
                <Input value={usageString} readOnly className="font-mono mt-1" />
            </div>
            
            {command.args && command.args.length > 0 && (
                <div>
                    <Label>Аргументы</Label>
                    <div className="rounded-md border mt-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Аргумент</TableHead>
                                    <TableHead>Тип</TableHead>
                                    <TableHead>Обязательный</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {command.args.map(arg => (
                                    <TableRow key={arg.name}>
                                        <TableCell>
                                            <p className="font-mono">{arg.name}</p>
                                            <p className="text-xs text-muted-foreground">{arg.description}</p>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{arg.type}</Badge></TableCell>
                                        <TableCell>{arg.required ? 'Да' : 'Нет'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
            <div>
                <Label>Источник</Label>
                <div className="mt-1">
                    <Badge variant={command.owner === OWNER_TYPES.SYSTEM ? 'secondary' : 'default'} className="text-sm">
                        {ownerName}
                    </Badge>
                </div>
            </div>
        </div>
    );
}

function CommandSettingsTab({ formData, onValueChange, allPermissions }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5"><Label>Команда включена</Label></div>
                <Switch checked={formData.isEnabled} onCheckedChange={checked => onValueChange('isEnabled', checked)} />
            </div>
            <div className="space-y-2">
                <Label>Алиасы</Label>
                <DynamicInputList value={formData.aliases} onChange={(v) => onValueChange('aliases', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cooldown">Кулдаун (сек)</Label>
                    <Input id="cooldown" type="number" min="0" value={formData.cooldown} onChange={e => onValueChange('cooldown', parseInt(e.target.value, 10) || 0)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="permissionId">Требуемое право</Label>
                    <Select value={formData.permissionId?.toString() || 'null'} onValueChange={v => onValueChange('permissionId', v === 'null' ? null : parseInt(v, 10))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null">Не требуется</SelectItem>
                            {allPermissions.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Разрешенные типы чатов</Label>
                <DynamicInputList value={formData.allowedChatTypes} onChange={(v) => onValueChange('allowedChatTypes', v)} />
            </div>
        </div>
    );
}


export default function CommandDetailDialog({ open, onOpenChange, command, allPermissions = [], onSubmit, isSaving }) {
    const [formData, setFormData] = useState(null);

    useEffect(() => {
        if (command) {
            setFormData({
                isEnabled: command.isEnabled,
                aliases: command.aliases || [],
                cooldown: command.cooldown || 0,
                permissionId: command.permissionId,
                allowedChatTypes: command.allowedChatTypes || []
            });
        }
    }, [command]);

    if (!command || !formData) return null;

    const handleValueChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Команда: {command.name}</DialogTitle>
                <DialogDescription>{command.description}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-grow flex flex-col">
                <TabsList>
                    <TabsTrigger value="overview">Обзор</TabsTrigger>
                    <TabsTrigger value="settings">Настройки</TabsTrigger>
                </TabsList>
                
                <ScrollArea className="flex-grow mt-4 pr-6 -mr-6">
                     <TabsContent value="overview">
                        <CommandOverviewTab command={command} />
                    </TabsContent>
                    <TabsContent value="settings">
                        <CommandSettingsTab formData={formData} onValueChange={handleValueChange} allPermissions={allPermissions} />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
            
            <DialogFooter className="mt-auto pt-4 border-t">
                <form id="command-edit-form" onSubmit={handleSubmit}>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Закрыть</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Сохранить настройки
                    </Button>
                </form>
            </DialogFooter>
        </DialogContent>
    );
}