import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from 'lucide-react';
import { apiHelper } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function ExportBotDialog({ bot, onCancel }) {
    const { t } = useTranslation('bots');
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
                toast({ title: t('export.success'), description: t('export.successMessage') });
                onCancel();
            } else {
                throw new Error(t('export.downloadError'));
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
                <DialogTitle>{t('export.title', { username: bot.username })}</DialogTitle>
                <DialogDescription>
                    {t('export.description')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="includeCommands" checked={options.includeCommands} onCheckedChange={(checked) => handleCheckedChange('includeCommands', checked)} />
                    <Label htmlFor="includeCommands">{t('export.includeCommands')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="includePermissions" checked={options.includePermissions} onCheckedChange={(checked) => handleCheckedChange('includePermissions', checked)} />
                    <Label htmlFor="includePermissions">{t('export.includePermissions')}</Label>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="includePluginFiles" checked={options.includePluginFiles} onCheckedChange={(checked) => handleCheckedChange('includePluginFiles', checked)} />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="includePluginFiles">{t('export.includePluginFiles')}</Label>
                        <p className="text-sm text-muted-foreground">
                            {t('export.includePluginFilesDesc')}
                        </p>
                    </div>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="includePluginDataStore" checked={options.includePluginDataStore} onCheckedChange={(checked) => handleCheckedChange('includePluginDataStore', checked)} />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="includePluginDataStore">{t('export.includePluginDataStore')}</Label>
                        <p className="text-sm text-muted-foreground">
                            {t('export.includePluginDataStoreDesc')}
                        </p>
                    </div>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="includeEventGraphs" checked={options.includeEventGraphs} onCheckedChange={(checked) => handleCheckedChange('includeEventGraphs', checked)} />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="includeEventGraphs">{t('export.includeEventGraphs')}</Label>
                        <p className="text-sm text-muted-foreground">
                            {t('export.includeEventGraphsDesc')}
                        </p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>{t('export.cancel')}</Button>
                <Button onClick={handleDownload} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {loading ? t('export.exporting') : t('export.download')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}