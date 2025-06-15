import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download } from 'lucide-react';

export default function ExportBotDialog({ bot, onCancel }) {
    const [options, setOptions] = useState({
        includeCommands: true,
        includePermissions: true,
        includePluginFiles: true,
    });

    const handleCheckedChange = (key, value) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };

    const handleDownload = () => {
        const query = new URLSearchParams(options).toString();
        const url = `/api/bots/${bot.id}/export?${query}`;
        window.location.href = url;
        onCancel();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Экспорт конфигурации: {bot.username}</DialogTitle>
                <DialogDescription>
                    Выберите данные, которые вы хотите включить в ZIP-архив.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="includeCommands" checked={options.includeCommands} onCheckedChange={(checked) => handleCheckedChange('includeCommands', checked)} />
                    <Label htmlFor="includeCommands">Настройки команд (алиасы, кулдауны и т.д.)</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="includePermissions" checked={options.includePermissions} onCheckedChange={(checked) => handleCheckedChange('includePermissions', checked)} />
                    <Label htmlFor="includePermissions">Пользователи и права доступа</Label>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="includePluginFiles" checked={options.includePluginFiles} onCheckedChange={(checked) => handleCheckedChange('includePluginFiles', checked)} />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="includePluginFiles">Включить файлы плагинов</Label>
                        <p className="text-sm text-muted-foreground">
                            Сохраняет не только список плагинов, но и их файлы, включая конфиги (например, `config.json`). Рекомендуется для полного бэкапа.
                        </p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Скачать архив
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}