import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from 'lucide-react';
import { apiHelper } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";

export default function ShareEventGraphDialog({ botId, graphId, onCancel }) {
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchGraphData = async () => {
            if (!botId || !graphId) return;
            setLoading(true);
            try {
                // Мы ожидаем получить "сырые" данные для экспорта, а не всего графа
                const data = await apiHelper(`/api/bots/${botId}/event-graphs/${graphId}/export`);
                setGraphData(JSON.stringify(data, null, 2));
            } catch (error) {
                console.error("Не удалось получить данные графа:", error);
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

        fetchGraphData();
    }, [botId, graphId, onCancel, toast]);

    const handleCopy = () => {
        if (graphData) {
            navigator.clipboard.writeText(graphData);
            toast({
                title: 'Скопировано!',
                description: 'Код для импорта скопирован в буфер обмена.',
            });
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Поделиться графом события</DialogTitle>
                <DialogDescription>
                    Скопируйте этот код, чтобы импортировать граф события на другом боте или поделиться им.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="graph-json">Код для импорта</Label>
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
                <Button variant="ghost" onClick={onCancel}>Закрыть</Button>
                <Button onClick={handleCopy} disabled={loading || !graphData}>
                    <Copy className="mr-2 h-4 w-4" />
                    Скопировать код
                </Button>
            </DialogFooter>
        </DialogContent>
    );
} 