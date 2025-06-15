import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

export default function LocalInstallDialog({ onInstall, onCancel, isInstalling }) {
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
                <DialogTitle>Установить плагин локально</DialogTitle>
                <DialogDescription>
                    Укажите полный путь к папке с плагином на сервере, где запущена панель.
                    Папка должна содержать валидный `package.json`.
                </DialogDescription>
            </DialogHeader>
            <form id="local-install-form" onSubmit={handleSubmit} className="py-4">
                <div className="space-y-2">
                    <Label htmlFor="path">Путь к папке плагина</Label>
                    <Input
                        id="path"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="Например, /home/user/my-bot-plugins/super-plugin"
                        required
                    />
                </div>
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button type="submit" form="local-install-form" disabled={isInstalling || !path.trim()}>
                    {isInstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isInstalling ? 'Установка...' : 'Установить'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}