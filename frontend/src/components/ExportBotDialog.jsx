import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from 'lucide-react';
import { apiHelper } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function ExportBotDialog({ bot, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState({
        includeCommands: true,
        includePermissions: true,
        includePluginFiles: true,
        includePluginDataStore: true,
        includeEventGraphs: true,
    });

    const handleCheckedChange = (key, value) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };

    const handleDownload = async () => {
        setLoading(true);
        const query = new URLSearchParams(options).toString();
        const url = `/api/bots/${bot.id}/export?${query}`;

        try {
            const blob = await apiHelper(url, { method: 'GET' });
            if (blob instanceof Blob) {
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', `bot_${bot.username}_export.zip`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
                toast({ title: "Успех!", description: "Экспорт бота запущен." });
                onCancel();
            } else {
                throw new Error("Не удалось получить файл для скачивания от сервера.");
            }
        } catch (error) {
            console.error("Ошибка экспорта бота:", error);
        } finally {
            setLoading(false);
        }
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
                            Сохраняет не только список плагинов, но и их файлы, включая конфиги. Рекомендуется для полного бэкапа.
                        </p>
                    </div>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="includePluginDataStore" checked={options.includePluginDataStore} onCheckedChange={(checked) => handleCheckedChange('includePluginDataStore', checked)} />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="includePluginDataStore">Базы данных плагинов</Label>
                        <p className="text-sm text-muted-foreground">
                            Все значения, которые плагины хранили в своих базах данных (DataStore), будут сохранены.
                        </p>
                    </div>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="includeEventGraphs" checked={options.includeEventGraphs} onCheckedChange={(checked) => handleCheckedChange('includeEventGraphs', checked)} />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="includeEventGraphs">Графы событий (субграфы)</Label>
                        <p className="text-sm text-muted-foreground">
                            Сохраняет все созданные графы событий и их настройки.
                        </p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button onClick={handleDownload} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {loading ? 'Экспорт...' : 'Скачать архив'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}