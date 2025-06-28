import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from 'lucide-react';
import { apiHelper } from '@/lib/api';

export default function ImportEventGraphDialog({ botId, onImportSuccess, onCancel }) {
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
            await apiHelper(`/api/bots/${botId}/event-graphs/import`, {
                method: 'POST',
                body: JSON.stringify(importData),
            }, `Граф события успешно импортирован.`);
            
            onImportSuccess();
        } catch (error) {
            // Ошибка уже обрабатывается в apiHelper
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Импорт графа события</DialogTitle>
                <DialogDescription>
                    Вставьте ранее скопированный код для импорта графа. Будет создан новый граф события.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="graph-json-input">Код для импорта</Label>
                <Textarea
                    id="graph-json-input"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='Вставьте сюда JSON...'
                    className="h-64 font-mono text-xs"
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button onClick={handleImport} disabled={isImporting || !jsonInput}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Upload className="mr-2 h-4 w-4" />
                    Импортировать
                </Button>
            </DialogFooter>
        </DialogContent>
    );
} 