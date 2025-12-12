import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function InputDialog({ open, onOpenChange, title, description, onConfirm, confirmText }) {
    const { t } = useTranslation('common');
    const [inputValue, setInputValue] = useState('');

    const handleConfirm = () => {
        onConfirm(inputValue);
        onOpenChange(false);
        setInputValue('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            {t('fields.name')}
                        </Label>
                        <Input
                            id="name"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
                    <Button onClick={handleConfirm}>{confirmText || t('actions.confirm')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 