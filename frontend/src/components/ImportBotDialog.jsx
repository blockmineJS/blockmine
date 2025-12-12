import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Settings } from 'lucide-react';
import { apiHelper } from '@/lib/api';
import BotForm from './BotForm';

export default function ImportBotDialog({ onImportSuccess, onCancel, servers }) {
    const { t } = useTranslation('bots');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importedData, setImportedData] = useState(null);
    const [step, setStep] = useState('upload');
    const { toast } = useToast();

    const handleFileChange = (event) => {
        console.log('[Import] handleFileChange вызван');
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            console.log('[Import] Выбран файл:', file.name, file.size, file.type);
            setSelectedFile(file);
        } else {
            console.log('[Import] Файл не выбран');
            setSelectedFile(null);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            toast({ variant: 'destructive', title: t('import.error'), description: t('import.selectFileError') });
            return;
        }

        console.log('[Import] Начинаем загрузку файла:', selectedFile.name);
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            console.log('[Import] Отправляем запрос на /api/bots/import/preview');
            const data = await apiHelper('/api/bots/import/preview', {
                method: 'POST',
                body: formData,
            });
            
            console.log('[Import] Получен ответ:', data);
            setImportedData(data);
            setStep('configure');
            toast({ title: t('import.success'), description: t('import.uploadSuccess') });

        } catch (error) {
            console.error('[Import] Ошибка:', error);
            toast({ variant: 'destructive', title: t('import.error'), description: error.message || t('import.uploadError') });
        } finally {
            setIsImporting(false);
        }
    };

    const handleFormSubmit = async (formData) => {
        setIsImporting(true);
        try {

            let body;
            try {
                body = JSON.stringify({
                    ...formData,
                    importData: importedData
                });
                console.log('[Import Create] JSON.stringify successful. Body length:', body.length);
            } catch (e) {
                console.error('[Import Create] Error during JSON.stringify:', e);
                toast({ variant: 'destructive', title: t('import.clientError'), description: t('import.prepareError') + ' ' + e.message });
                setIsImporting(false);
                return;
            }

            const data = await apiHelper('/api/bots/import/create', {
                method: 'POST',
                body: body,
            });
            
            onImportSuccess(data);
            toast({ title: t('import.success'), description: t('import.createSuccess') });

        } catch (error) {
            console.error('[Import Create] API Error:', error);
            toast({ variant: 'destructive', title: t('import.error'), description: error.message || t('import.createError') });
        } finally {
            setIsImporting(false);
        }
    };

    const handleBack = () => {
        setStep('upload');
        setImportedData(null);
        setSelectedFile(null);
    };

    if (step === 'configure' && importedData) {
        return (
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{t('import.configureTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('import.configureDescription')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            <div className="mb-4 p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4" />
                                    <span className="font-medium">{t('import.importedData')}</span>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div>• {t('import.plugins', { count: importedData.plugins?.length || 0 })}</div>
                                    <div>• {t('import.commands', { count: importedData.commands?.length || 0 })}</div>
                                    <div>• {t('import.eventGraphs', { count: importedData.eventGraphs?.length || 0 })}</div>
                                    <div>• {t('import.settings', { count: importedData.settings?.length || 0 })}</div>
                                </div>
                            </div>
                            <BotForm 
                                servers={servers}
                                onFormSubmit={handleFormSubmit}
                                isCreation={true}
                                isSaving={isImporting}
                                importedData={importedData}
                                disableScrollArea={true}
                            />
                        </div>
                    </ScrollArea>
                </div>
                
                <DialogFooter className="px-6 py-4 border-t">
                    <Button variant="ghost" onClick={handleBack} disabled={isImporting}>
                        {t('import.back')}
                    </Button>
                    <Button
                        type="submit"
                        form="bot-form"
                        disabled={isImporting}
                    >
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('import.createBot')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        );
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('import.title')}</DialogTitle>
                <DialogDescription>
                    {t('import.description')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="botFile">{t('import.fileLabel')}</Label>
                    <Input id="botFile" type="file" accept=".zip" onChange={handleFileChange} />
                    {selectedFile && (
                        <div className="text-sm text-green-600 dark:text-green-400">
                            {t('import.fileSelected', { name: selectedFile.name, size: (selectedFile.size / 1024).toFixed(1) })}
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>{t('import.cancel')}</Button>
                <Button
                    onClick={() => {
                        console.log('[Import] Кнопка "Загрузить и настроить" нажата');
                        console.log('[Import] selectedFile:', selectedFile);
                        console.log('[Import] isImporting:', isImporting);
                        handleFileUpload();
                    }}
                    disabled={isImporting || !selectedFile}
                >
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Upload className="mr-2 h-4 w-4" />
                    {t('import.uploadAndConfigure')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}