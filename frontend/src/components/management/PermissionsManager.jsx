import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

function PermissionForm({ onSubmit, onCancel, isSaving }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ name, description });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Создать новое право</DialogTitle>
                <DialogDescription>Права используются для тонкой настройки доступа к командам.</DialogDescription>
            </DialogHeader>
            <form id="permission-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="perm-name">Название права (например, plugin.name.action)</Label>
                    <Input id="perm-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="perm-desc">Описание</Label>
                    <Input id="perm-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
            </form>
             <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button type="submit" form="permission-form" disabled={isSaving}>
                    {isSaving ? 'Создание...' : 'Создать'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function PermissionsManager({ permissions, botId, isLoading, onDataChange }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (permissionData) => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/bots/${botId}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(permissionData),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server Error');
            toast({ title: "Успех!", description: "Новое право успешно создано." });
            setIsModalOpen(false);
            onDataChange();
        } catch (error) {
            toast({ variant: "destructive", title: "Ошибка", description: error.message });
        }
        setIsSaving(false);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Права</CardTitle>
                        <CardDescription>Полный список всех прав, зарегистрированных для этого бота.</CardDescription>
                    </div>
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4"/>Создать право</Button>
                        </DialogTrigger>
                        <PermissionForm onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)} isSaving={isSaving} />
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Право</TableHead>
                            <TableHead>Описание</TableHead>
                            <TableHead>Источник</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                             <TableRow><TableCell colSpan={3} className="text-center">Загрузка...</TableCell></TableRow>
                        ) : (
                            permissions.map(perm => (
                                <TableRow key={perm.id}>
                                    <TableCell className="font-mono">{perm.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{perm.description}</TableCell>
                                    <TableCell><Badge variant={perm.owner === 'system' ? 'secondary' : 'default'}>{perm.owner}</Badge></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
