import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from './ui/badge';
import { Cpu, MemoryStick } from 'lucide-react';

const ProgressBar = ({ value, max, colorClass }) => {
    const percentage = Math.min(100, (value / max) * 100);
    return (
        <div className="w-full bg-muted rounded-full h-2">
            <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export default function ResourceUsageWidget({ bots, resourceUsage }) {
    const runningBots = bots.filter(bot => resourceUsage[bot.id]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Использование ресурсов</CardTitle>
                <CardDescription>Нагрузка на CPU и использование RAM запущенными ботами.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                <div className="space-y-6">
                    {runningBots.length > 0 ? runningBots.map(bot => {
                        const usage = resourceUsage[bot.id];
                        return (
                            <div key={bot.id}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">{bot.username}</h4>
                                    <Badge variant="secondary">ID: {bot.id}</Badge>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Cpu className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-grow">
                                            <ProgressBar value={usage.cpu} max={100} colorClass="bg-blue-500" />
                                        </div>
                                        <span className="text-sm font-mono w-16 text-right">{usage.cpu.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MemoryStick className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-grow">
                                            <ProgressBar value={usage.memory} max={500} colorClass="bg-green-500" />
                                        </div>
                                        <span className="text-sm font-mono w-16 text-right">{usage.memory.toFixed(1)} MB</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <p className="text-sm text-muted-foreground text-center pt-8">Нет запущенных ботов для мониторинга.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}