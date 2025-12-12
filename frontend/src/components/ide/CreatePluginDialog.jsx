import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from '@/hooks/use-toast';

const VALID_PLUGIN_NAME_PATTERN = /[^a-zA-Z0-9-]/g;
const isValidPluginName = (name) => /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(name);

export default function CreatePluginDialog({ open, onOpenChange, onCreate }) {
    const { t } = useTranslation('plugins');
    const [name, setName] = useState('');
    const [template, setTemplate] = useState('empty');
    const [error, setError] = useState('');

    const handleNameChange = (e) => {
        const sanitizedName = e.target.value.replace(VALID_PLUGIN_NAME_PATTERN, '');
        setName(sanitizedName);
        if (sanitizedName && !isValidPluginName(sanitizedName)) {
            setError(t('createDialog.invalidNameFormat'));
        } else {
            setError('');
        }
    };

    const handleCreate = () => {
        if (!isValidPluginName(name)) {
            toast({
                variant: 'destructive',
                title: t('createDialog.validationError'),
                description: t('createDialog.enterValidName')
            });
            return;
        }
        onCreate({ name, template });
        onOpenChange(false);
        setName('');
        setTemplate('empty');
    };

    const isButtonDisabled = !name || !isValidPluginName(name);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('createDialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('createDialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('createDialog.nameLabel')} ({t('createDialog.namePlaceholder')})</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={handleNameChange}
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('createDialog.templateLabel')}</Label>
                        <RadioGroup value={template} onValueChange={setTemplate}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="empty" id="r1" />
                                <Label htmlFor="r1">{t('createDialog.templates.empty')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="command" id="r2" />
                                <Label htmlFor="r2">{t('createDialog.templates.command')}</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
                    <Button onClick={handleCreate} disabled={isButtonDisabled}>{t('createDialog.create')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 