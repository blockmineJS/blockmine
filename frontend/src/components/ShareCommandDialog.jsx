import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from 'lucide-react';
import { apiHelper } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from '@/lib/clipboard';

export default function ShareCommandDialog({ botId, commandId, onCancel }) {
    const { t } = useTranslation('dialogs');
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
                console.error(t('share.command.fetchError'), error);
                toast({
                    variant: 'destructive',
                    title: t('common.error'),
                    description: t('share.loadError'),
                });
                onCancel();
            } finally {
                setLoading(false);
            }
        };

        if (commandId) {
            fetchCommandData();
        }
    }, [botId, commandId, onCancel, toast, t]);

    const handleCopy = async () => {
        if (commandData) {
            const success = await copyToClipboard(commandData);
            if (success) {
                toast({
                    title: t('share.copied'),
                    description: t('share.copiedDescription'),
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: t('common.error'),
                    description: t('share.copyError'),
                });
            }
        }
    };

    return (
        <Dialog open={!!commandId} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('share.command.title')}</DialogTitle>
                    <DialogDescription>
                        {t('share.command.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="command-json">{t('share.codeLabel')}</Label>
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
                    <Button variant="ghost" onClick={onCancel}>{t('share.close')}</Button>
                    <Button onClick={handleCopy} disabled={loading || !commandData}>
                        <Copy className="mr-2 h-4 w-4" />
                        {t('share.copyCode')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 