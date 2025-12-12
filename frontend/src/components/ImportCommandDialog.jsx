import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from 'lucide-react';
import { apiHelper } from '@/lib/api';

export default function ImportCommandDialog({ botId, open, onOpenChange, onImportSuccess }) {
    const { t } = useTranslation('dialogs');
    const [jsonInput, setJsonInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const handleImport = async () => {
        let importData;
        try {
            importData = JSON.parse(jsonInput);
        } catch (error) {
            toast({ variant: 'destructive', title: t('common.error'), description: t('import.invalidJson') });
            return;
        }

        setIsImporting(true);
        try {
            await apiHelper(`/api/bots/${botId}/commands/import`, {
                method: 'POST',
                body: JSON.stringify(importData),
            }, t('import.command.success'));

            onImportSuccess();
        } catch (error) {
            // apiHelper уже показывает тост в случае ошибки
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('import.command.title')}</DialogTitle>
                    <DialogDescription>
                        {t('import.command.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="command-json-input">{t('import.codeLabel')}</Label>
                    <Textarea
                        id="command-json-input"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={t('import.placeholder')}
                        className="h-64 font-mono text-xs"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('import.cancel')}</Button>
                    <Button onClick={handleImport} disabled={isImporting || !jsonInput}>
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Upload className="mr-2 h-4 w-4" />
                        {t('import.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 