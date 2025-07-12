import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from './ui/badge';
import { Cpu, MemoryStick } from 'lucide-react';

const ProgressBar = ({ value, max, colorClass, label }) => {
    const percentage = Math.min(100, (value / max) * 100);
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium">{value.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                <div 
                    className={`${colorClass} h-2 rounded-full transition-all duration-300 ease-out`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default function ResourceUsageWidget({ bots, resourceUsage }) {
    const runningBots = bots.filter(bot => resourceUsage[bot.id]);

    return (
        <div className="h-full flex flex-col">
            <div className="mb-4">
                <CardTitle className="text-base font-semibold">Использование ресурсов</CardTitle>
                <CardDescription className="text-sm">Нагрузка на CPU и использование RAM запущенными ботами</CardDescription>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                <div className="space-y-6">
                    {runningBots.length > 0 ? runningBots.map(bot => {
                        const usage = resourceUsage[bot.id];
                        return (
                            <div key={bot.id} className="p-4 rounded-lg border bg-background/50 hover:bg-background/70 transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-foreground">{bot.username}</h4>
                                    <Badge variant="outline" className="text-xs">ID: {bot.id}</Badge>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10">
                                            <Cpu className="h-4 w-4 text-blue-500" />
                                        </div>
                                        <div className="flex-grow">
                                            <ProgressBar 
                                                value={usage.cpu} 
                                                max={100} 
                                                colorClass="bg-gradient-to-r from-blue-500 to-blue-600" 
                                                label="CPU"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-500/10">
                                            <MemoryStick className="h-4 w-4 text-green-500" />
                                        </div>
                                        <div className="flex-grow">
                                            <ProgressBar 
                                                value={usage.memory} 
                                                max={500} 
                                                colorClass="bg-gradient-to-r from-green-500 to-emerald-600" 
                                                label="RAM"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="p-4 rounded-full bg-muted/50 mb-4">
                                <Cpu className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">Нет запущенных ботов</p>
                            <p className="text-xs text-muted-foreground mt-1">Запустите ботов для мониторинга ресурсов</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}