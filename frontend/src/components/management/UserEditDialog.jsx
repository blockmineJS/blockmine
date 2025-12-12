import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

export default function UserEditDialog({ user, allGroups, onSubmit, onCancel, isSaving }) {
    const { t } = useTranslation('management');
    const [isBlacklisted, setIsBlacklisted] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState(new Set());

    useEffect(() => {
        if (user) {
            setIsBlacklisted(user.isBlacklisted);
            const initialGroups = new Set(user.groups.map(g => g.groupId));
            setSelectedGroups(initialGroups);
        }
    }, [user]);

    const handleToggleGroup = (groupId) => {
        setSelectedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            isBlacklisted,
            groupIds: Array.from(selectedGroups),
        });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('userEdit.title', { name: user?.username })}</DialogTitle>
                <DialogDescription>{t('userEdit.description')}</DialogDescription>
            </DialogHeader>
            <form id="user-edit-form" onSubmit={handleSubmit}>
                <div className="py-4 space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>{t('userEdit.blacklist')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('userEdit.blacklistDescription')}
                            </p>
                        </div>
                        <Switch checked={isBlacklisted} onCheckedChange={setIsBlacklisted} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('userEdit.userGroups')}</Label>
                        <ScrollArea className="h-60 w-full rounded-md border p-4">
                            <div className="space-y-2">
                                {allGroups.map(group => (
                                    <div key={group.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`group-${group.id}`}
                                            checked={selectedGroups.has(group.id)}
                                            onCheckedChange={() => handleToggleGroup(group.id)}
                                        />
                                        <label htmlFor={`group-${group.id}`} className="text-sm font-medium">
                                            {group.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>{t('userEdit.cancel')}</Button>
                <Button type="submit" form="user-edit-form" disabled={isSaving}>
                    {isSaving ? t('userEdit.saving') : t('userEdit.save')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
