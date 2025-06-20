
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function RoleFormDialog({ role, allPermissions, onSubmit, onCancel, isSaving }) {
    const [name, setName] = useState('');
    const [selectedPerms, setSelectedPerms] = useState(new Set());
    const { toast } = useToast();

    const isEditMode = !!role;

    useEffect(() => {
        if (isEditMode) {
            setName(role.name);
            setSelectedPerms(new Set(role.permissions || []));
        } else {
            setName('');
            setSelectedPerms(new Set());
        }
    }, [role, isEditMode]);

    const handleTogglePermission = (permId) => {
        setSelectedPerms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(permId)) {
                newSet.delete(permId);
            } else {
                newSet.add(permId);
            }
            return newSet;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Имя роли не может быть пустым.' });
            return;
        }
        onSubmit({ name, permissions: Array.from(selectedPerms) }, role?.id);
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{isEditMode ? 'Редактировать роль' : 'Создать новую роль'}</DialogTitle>
                <DialogDescription>Укажите имя роли и выберите доступные ей права.</DialogDescription>
            </DialogHeader>
            <form id="role-form" onSubmit={handleSubmit} className="py-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Название роли</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Права доступа</Label>
                        <ScrollArea className="h-72 w-full rounded-md border p-4">
                            <div className="space-y-2">
                                {allPermissions.map(perm => (
                                    <div key={perm.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`perm-${perm.id}`}
                                            checked={selectedPerms.has(perm.id)}
                                            onCheckedChange={() => handleTogglePermission(perm.id)}
                                        />
                                        <label htmlFor={`perm-${perm.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {perm.label} <span className="text-xs text-muted-foreground">({perm.id})</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button type="submit" form="role-form" disabled={isSaving}>
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}