import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from 'lucide-react';
import { apiHelper } from '@/lib/api';

export default function ImportCommandDialog({ botId, open, onOpenChange, onImportSuccess }) {
    const [jsonInput, setJsonInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const handleImport = async () => {
        let importData;
        try {
            importData = JSON.parse(jsonInput);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Неверный формат JSON.' });
            return;
        }

        setIsImporting(true);
        try {
            await apiHelper(`/api/bots/${botId}/commands/import`, {
                method: 'POST',
                body: JSON.stringify(importData),
            }, `Команда успешно импортирована.`);
            
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
                    <DialogTitle>Импорт команды</DialogTitle>
                    <DialogDescription>
                        Вставьте ранее скопированный код для импорта команды. Будет создана новая команда.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="command-json-input">Код для импорта</Label>
                    <Textarea
                        id="command-json-input"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='Вставьте сюда JSON...'
                        className="h-64 font-mono text-xs"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button onClick={handleImport} disabled={isImporting || !jsonInput}>
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Upload className="mr-2 h-4 w-4" />
                        Импортировать
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 