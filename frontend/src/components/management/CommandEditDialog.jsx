import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import DynamicInputList from './DynamicInputList';

export default function CommandEditDialog({ command, allPermissions = [], onSubmit, onCancel, isSaving }) {
    const { t } = useTranslation('management');
    const [formData, setFormData] = useState({
        isEnabled: true,
        aliases: [],
        cooldown: 0,
        permissionId: null,
        allowedChatTypes: []
    });

    useEffect(() => {
        if (command) {
            let parsedAliases = [];
            let parsedChatTypes = [];

            try {
                parsedAliases = Array.isArray(command.aliases) 
                    ? command.aliases 
                    : JSON.parse(command.aliases || '[]');
            } catch (e) {
                console.error("Could not parse aliases in dialog:", command.aliases);
            }

            try {
                parsedChatTypes = Array.isArray(command.allowedChatTypes) 
                    ? command.allowedChatTypes 
                    : JSON.parse(command.allowedChatTypes || '[]');
            } catch (e) {
                console.error("Could not parse allowedChatTypes in dialog:", command.allowedChatTypes);
            }

            setFormData({
                isEnabled: command.isEnabled,
                aliases: parsedAliases,
                cooldown: command.cooldown || 0,
                permissionId: command.permissionId,
                allowedChatTypes: parsedChatTypes
            });
        }
    }, [command]);

    const handleValueChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            isEnabled: formData.isEnabled,
            aliases: formData.aliases,
            cooldown: formData.cooldown,
            permissionId: formData.permissionId,
            allowedChatTypes: formData.allowedChatTypes
        });
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{t('commandEdit.title', { name: command?.name })}</DialogTitle>
                <DialogDescription>{command?.description}</DialogDescription>
            </DialogHeader>
            <form id="command-edit-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5"><Label>{t('commandEdit.enabled')}</Label></div>
                    <Switch checked={formData.isEnabled} onCheckedChange={checked => handleValueChange('isEnabled', checked)} />
                </div>

                <div className="space-y-2">
                    <Label>{t('commandEdit.aliases')}</Label>
                    <DynamicInputList
                        value={formData.aliases}
                        onChange={(newAliases) => handleValueChange('aliases', newAliases)}
                        placeholder={t('commandEdit.aliasesPlaceholder')}
                    />
                    <p className="text-sm text-muted-foreground">{t('commandEdit.aliasesDescription')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="cooldown">{t('commandEdit.cooldown')}</Label>
                        <Input
                            id="cooldown"
                            type="number"
                            min="0"
                            value={formData.cooldown}
                            onChange={e => handleValueChange('cooldown', parseInt(e.target.value, 10) || 0)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="permissionId">{t('commandEdit.requiredPermission')}</Label>
                        <Select
                            value={formData.permissionId?.toString() || 'null'}
                            onValueChange={value => handleValueChange('permissionId', value === 'null' ? null : parseInt(value, 10))}
                        >
                            <SelectTrigger><SelectValue placeholder={t('commandEdit.selectPermission')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">{t('commandEdit.noPermission')}</SelectItem>
                                {allPermissions.map(perm => (
                                    <SelectItem key={perm.id} value={perm.id.toString()}>{perm.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('commandEdit.allowedChatTypes')}</Label>
                    <DynamicInputList
                        value={formData.allowedChatTypes}
                        onChange={(newTypes) => handleValueChange('allowedChatTypes', newTypes)}
                        placeholder={t('commandEdit.chatTypesPlaceholder')}
                    />
                    <p className="text-sm text-muted-foreground">{t('commandEdit.chatTypesDescription')}</p>
                </div>

            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>{t('commandEdit.cancel')}</Button>
                <Button type="submit" form="command-edit-form" disabled={isSaving}>
                    {isSaving ? t('commandEdit.saving') : t('commandEdit.save')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}