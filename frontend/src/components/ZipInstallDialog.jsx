import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ZipInstallDialog({ onInstall, onCancel, isInstalling }) {
    const { t } = useTranslation('plugins');
    const [file, setFile] = useState(null);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (file) {
            onInstall(file);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('zipInstall.title')}</DialogTitle>
                <DialogDescription>{t('zipInstall.description')}</DialogDescription>
            </DialogHeader>
            <form id="zip-install-form" onSubmit={handleSubmit} className="py-4">
                <div className="space-y-2">
                    <Label htmlFor="plugin-zip">{t('zipInstall.fileLabel')}</Label>
                    <Input
                        id="plugin-zip"
                        type="file"
                        accept=".zip,application/zip"
                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                        required
                    />
                </div>
            </form>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    {t('actions.cancel')}
                </Button>
                <Button type="submit" form="zip-install-form" disabled={isInstalling || !file}>
                    {isInstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isInstalling ? t('messages.installing') : t('zipInstall.install')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
