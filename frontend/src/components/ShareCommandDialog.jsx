import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from 'lucide-react';
import { apiHelper } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from '@/lib/clipboard';

export default function ShareCommandDialog({ botId, commandId, onCancel }) {
    const [commandData, setCommandData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCommandData = async () => {
            if (!botId || !commandId) return;
            setLoading(true);
            try {
                const data = await apiHelper(`/api/bots/${botId}/commands/${commandId}/export`);
                setCommandData(JSON.stringify(data, null, 2));
            } catch (error) {
                console.error("Не удалось получить данные команды:", error);
                toast({
                    variant: 'destructive',
                    title: 'Ошибка',
                    description: 'Не удалось загрузить данные для экспорта.',
                });
                onCancel();
            } finally {
                setLoading(false);
            }
        };

        if (commandId) {
            fetchCommandData();
        }
    }, [botId, commandId, onCancel, toast]);

    const handleCopy = async () => {
        if (commandData) {
            const success = await copyToClipboard(commandData);
            if (success) {
                toast({
                    title: 'Скопировано!',
                    description: 'Код для импорта скопирован в буфер обмена.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Ошибка',
                    description: 'Не удалось скопировать код. Попробуйте выделить и скопировать вручную.',
                });
            }
        }
    };

    return (
        <Dialog open={!!commandId} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Поделиться командой</DialogTitle>
                    <DialogDescription>
                        Скопируйте этот код, чтобы импортировать команду на другом боте или поделиться ей.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="command-json">Код для импорта</Label>
                    {loading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Textarea
                            id="command-json"
                            readOnly
                            value={commandData || ''}
                            className="h-64 font-mono text-xs"
                        />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>Закрыть</Button>
                    <Button onClick={handleCopy} disabled={loading || !commandData}>
                        <Copy className="mr-2 h-4 w-4" />
                        Скопировать код
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 