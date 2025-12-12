import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export default function GroupFormDialog({ group, allPermissions, onSubmit, onCancel, isSaving }) {
    const { t } = useTranslation('permissions');
    const [name, setName] = useState('');
    const [selectedPerms, setSelectedPerms] = useState(new Set());
    const { toast } = useToast();

    useEffect(() => {
        if (group) {
            setName(group.name);
            const initialPerms = new Set(group.permissions.map(p => p.permissionId));
            setSelectedPerms(initialPerms);
        } else {
            setName('');
            setSelectedPerms(new Set());
        }
    }, [group]);

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
            toast({ variant: 'destructive', title: t('common.error'), description: t('groupForm.emptyName') });
            return;
        }
        onSubmit({ name, permissionIds: Array.from(selectedPerms) });
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{group ? t('groupForm.titleEdit') : t('groupForm.titleCreate')}</DialogTitle>
                <DialogDescription>{t('groupForm.description')}</DialogDescription>
            </DialogHeader>
            <form id="group-form" onSubmit={handleSubmit}>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('groupForm.nameLabel')}</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('groupForm.permissionsLabel')}</Label>
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
                                            {perm.name}
                                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button type="submit" form="group-form" disabled={isSaving}>
                    {isSaving ? t('common.saving') : t('common.save')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}