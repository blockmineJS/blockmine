import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from 'lucide-react';
import { apiHelper } from '@/lib/api';

export default function ImportBotDialog({ onImportSuccess, onCancel }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Пожалуйста, выберите файл для импорта.' });
            return;
        }

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const data = await apiHelper('/api/bots/import', {
                method: 'POST',
                body: formData,
            }, `Бот успешно импортирован.`);
            
            onImportSuccess(data);

        } catch (error) {
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Импорт бота из архива</DialogTitle>
                <DialogDescription>
                    Выберите ZIP-архив, ранее экспортированный из панели. Будет создан новый бот со всеми плагинами и настройками. Пароли не переносятся.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="botFile">Файл экспорта (.zip)</Label>
                    <Input id="botFile" type="file" accept=".zip" onChange={handleFileChange} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button onClick={handleImport} disabled={isImporting || !selectedFile}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Upload className="mr-2 h-4 w-4" />
                    Импортировать
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}