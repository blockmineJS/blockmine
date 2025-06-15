import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from './ui/badge';

export default function RecentActivityWidget({ bots, botLogs }) {
    const recentLogs = bots.flatMap(bot => 
        (botLogs[bot.id] || []).slice(0, 5).map(log => ({
            botUsername: bot.username,
            log: log,
            id: `${bot.id}-${log}-${Math.random()}` 
        }))
    ).sort(() => Math.random() - 0.5).slice(0, 20);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Последняя активность</CardTitle>
                <CardDescription>Сводка последних сообщений из консоли ботов.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                        {recentLogs.length > 0 ? recentLogs.map(item => (
                            <div key={item.id} className="flex items-start gap-3">
                                <Badge variant="secondary" className="mt-1 shrink-0">{item.botUsername}</Badge>
                                <p className="text-sm text-muted-foreground break-all">
                                    {item.log}
                                </p>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center pt-8">Нет активности. Запустите ботов.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}