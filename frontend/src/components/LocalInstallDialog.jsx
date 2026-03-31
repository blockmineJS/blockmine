import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LocalInstallDialog({ onInstall, onCancel, isInstalling }) {
    const { t } = useTranslation('plugins');
    const [path, setPath] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (path.trim()) {
            onInstall(path.trim());
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('localInstall.title', { defaultValue: 'Установить плагин локально' })}</DialogTitle>
                <DialogDescription>
                    {t('localInstall.description', {
                        defaultValue: 'Укажите полный путь к папке с плагином на сервере, где запущена панель. Папка должна содержать валидный package.json.',
                    })}
                </DialogDescription>
            </DialogHeader>
            <form id="local-install-form" onSubmit={handleSubmit} className="py-4">
                <div className="space-y-2">
                    <Label htmlFor="path">{t('localInstall.pathLabel', { defaultValue: 'Путь к папке плагина' })}</Label>
                    <Input
                        id="path"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder={t('localInstall.pathPlaceholder', {
                            defaultValue: 'Например, /home/user/my-bot-plugins/super-plugin',
                        })}
                        required
                    />
                </div>
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>
                    {t('actions.cancel', { defaultValue: 'Отмена' })}
                </Button>
                <Button type="submit" form="local-install-form" disabled={isInstalling || !path.trim()}>
                    {isInstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isInstalling
                        ? t('messages.installing', { defaultValue: 'Установка...' })
                        : t('localInstall.install', { defaultValue: 'Установить' })}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
