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

export default function ShareEventGraphDialog({ botId, graphId, onCancel }) {
    const { t } = useTranslation('dialogs');
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchGraphData = async () => {
            if (!botId || !graphId) return;
            setLoading(true);
            try {
                const data = await apiHelper(`/api/bots/${botId}/event-graphs/${graphId}/export`);
                setGraphData(JSON.stringify(data, null, 2));
            } catch (error) {
                console.error(t('share.eventGraph.fetchError'), error);
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

        if (graphId) {
            fetchGraphData();
        }
    }, [botId, graphId, onCancel, toast, t]);

    const handleCopy = async () => {
        if (graphData) {
            const success = await copyToClipboard(graphData);
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
        <Dialog open={!!graphId} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('share.eventGraph.title')}</DialogTitle>
                    <DialogDescription>
                        {t('share.eventGraph.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="graph-json">{t('share.codeLabel')}</Label>
                    {loading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Textarea
                            id="graph-json"
                            readOnly
                            value={graphData || ''}
                            className="h-64 font-mono text-xs"
                        />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>{t('share.close')}</Button>
                    <Button onClick={handleCopy} disabled={loading || !graphData}>
                        <Copy className="mr-2 h-4 w-4" />
                        {t('share.copyCode')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 