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
import { Save, Loader2, Terminal, Settings as SettingsIcon, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';

const OWNER_TYPES = {
  SYSTEM: 'system'
};

function CommandOverviewTab({ command }) {
    const usageString = `@${command.name} ${command.args?.map(arg => arg.required ? `<${arg.name}>` : `[${arg.name}]`).join(' ') || ''}`;
    const ownerName = command.owner ? command.owner.replace('plugin:', '') : '';
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const success = await copyToClipboard(usageString);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <Label className="text-base font-semibold mb-2 block">Использование</Label>
                <div className="bg-muted border border-border/50 rounded-lg px-4 py-2 font-mono text-sm select-all">
                    <span>{usageString}</span>
                </div>
            </div>
            {command.args && command.args.length > 0 && (
                <div>
                    <Label className="text-base font-semibold mb-2 block">Аргументы</Label>
                    <div className="rounded-xl border bg-muted/40 mt-1 overflow-hidden">
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
                                            <span className="font-mono font-semibold">{arg.name}</span>
                                            <div className="text-xs text-muted-foreground">{arg.description}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{arg.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {arg.required ? (
                                                <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Да</Badge>
                                            ) : (
                                                <Badge variant="secondary">Нет</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
            <div>
                <Label className="text-base font-semibold mb-2 block">Источник</Label>
                <Badge variant={command.owner === OWNER_TYPES.SYSTEM ? 'secondary' : 'default'} className="text-sm px-3 py-1">
                    {command.owner ? command.owner.replace('plugin:', '') : ''}
                </Badge>
            </div>
        </div>
    );
}

function CommandSettingsTab({ formData, onValueChange, allPermissions }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5"><Label>Команда включена</Label></div>
                <Switch checked={formData.isEnabled} onCheckedChange={checked => onValueChange('isEnabled', checked)} />
            </div>
            <div className="space-y-2">
                <Label>Алиасы</Label>
                <DynamicInputList value={formData.aliases} onChange={(v) => onValueChange('aliases', v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

export default function CommandDetailDialog({ command, allPermissions = [], onSubmit, isSaving, onCancel }) {
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
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col bg-card rounded-2xl">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-muted rounded-lg blur-sm opacity-20" />
                        <div className="relative bg-muted p-2 rounded-lg">
                            <Terminal className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-bold">
                            Команда: {command.name}
                        </DialogTitle>
                        <DialogDescription className="text-base text-muted-foreground">
                            {command.description}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-grow flex flex-col mt-2">
                <TabsList className="mb-4 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-lg">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Обзор
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4" />
                        Настройки
                    </TabsTrigger>
                </TabsList>
                <ScrollArea className="flex-grow pr-6 -mr-6">
                    <TabsContent value="overview">
                        <div className="space-y-8">
                            <div>
                                <Label className="text-base font-semibold mb-2 block">Использование</Label>
                                <div className="bg-muted border border-border/50 rounded-lg px-4 py-2 font-mono text-sm select-all">
                                    @{command.name} {command.args?.map(arg => arg.required ? `<${arg.name}>` : `[${arg.name}]`).join(' ') || ''}
                                </div>
                            </div>
                            {command.args && command.args.length > 0 && (
                                <div>
                                    <Label className="text-base font-semibold mb-2 block">Аргументы</Label>
                                    <div className="rounded-xl border bg-muted/40 mt-1 overflow-hidden">
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
                                                            <span className="font-mono font-semibold">{arg.name}</span>
                                                            <div className="text-xs text-muted-foreground">{arg.description}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{arg.type}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {arg.required ? (
                                                                <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Да</Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Нет</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                            <div>
                                <Label className="text-base font-semibold mb-2 block">Источник</Label>
                                <Badge variant={command.owner === OWNER_TYPES.SYSTEM ? 'secondary' : 'default'} className="text-sm px-3 py-1">
                                    {command.owner ? command.owner.replace('plugin:', '') : ''}
                                </Badge>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="settings">
                        <CommandSettingsTab formData={formData} onValueChange={handleValueChange} allPermissions={allPermissions} />
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <DialogFooter className="mt-auto pt-4 border-t">
                <form id="command-edit-form" onSubmit={handleSubmit} className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={onCancel}>Закрыть</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Сохранить настройки
                    </Button>
                </form>
            </DialogFooter>
        </DialogContent>
    );
}