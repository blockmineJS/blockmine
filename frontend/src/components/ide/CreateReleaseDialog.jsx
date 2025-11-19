import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Tag } from 'lucide-react';

export default function CreateReleaseDialog({ isOpen, onClose, version, onConfirm, isLoading }) {
    const [description, setDescription] = useState('');

    const handleCreate = () => {
        onConfirm(description);
    };

    const handleClose = () => {
        setDescription('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Создать релиз {version}
                    </DialogTitle>
                    <DialogDescription>
                        Создайте тег и релиз на GitHub для версии {version}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="description" className="mb-2 block">
                            Описание обновления
                        </Label>
                        <Textarea
                            id="description"
                            placeholder={`- Добавлена функция X\n- Исправлен баг Y\n- Улучшена производительность`}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={8}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Опишите что изменилось в этой версии (опционально)
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Отмена
                    </Button>
                    <Button onClick={handleCreate} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Создание...
                            </>
                        ) : (
                            <>
                                <Tag className="h-4 w-4 mr-2" />
                                Создать релиз
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
