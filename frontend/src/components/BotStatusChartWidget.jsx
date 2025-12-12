import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
    running: '#22c55e',
    stopped: '#ef4444',
    errored: '#f97316',
};

export default function BotStatusChartWidget({ stats }) {
    const { t } = useTranslation('dashboard');

    const runningLabel = t('widgets.botStatus.running');
    const stoppedLabel = t('widgets.botStatus.stopped');

    const data = [
        { name: runningLabel, value: stats.runningBots, key: 'running' },
        { name: stoppedLabel, value: stats.stoppedBots, key: 'stopped' },
    ].filter(d => d.value > 0);

    if (data.length === 0) {
       return (
         <Card>
            <CardHeader><CardTitle>{t('widgets.botStatus.title')}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
                {t('widgets.botStatus.noBots')}
            </CardContent>
         </Card>
       )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('widgets.botStatus.title')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.key]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: "hsl(var(--background))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "var(--radius)"
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}