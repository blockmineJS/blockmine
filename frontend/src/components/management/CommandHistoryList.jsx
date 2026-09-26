import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { apiHelper } from '@/lib/api';

function formatCommandArgs(args) {
    if (!args) return '';
    if (Array.isArray(args)) return args.join(' ');
    if (typeof args === 'object') {
        return Object.entries(args)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }
    return String(args);
}

function HistoryTable({ botId, commandName, scope }) {
    const { t } = useTranslation('management');
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!botId) return undefined;
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        const query = commandName ? `command=${encodeURIComponent(commandName)}&` : '';
        apiHelper(`/api/bot-history/${botId}/commands?${query}scope=${scope}&limit=100`)
            .then((data) => {
                if (cancelled) return;
                setLogs(data.logs || []);
                setTotal(data.total || 0);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [botId, commandName, scope]);

    const body = loading ? (
        <p className="text-sm text-muted-foreground">{t('commandDetail.historyLoading')}</p>
    ) : failed ? (
        <p className="text-sm text-destructive">{t('commandDetail.historyError')}</p>
    ) : logs.length === 0 ? (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
                {commandName ? t('commandDetail.historyEmpty') : t('commandHistory.empty')}
            </p>
            <p className="text-xs text-muted-foreground">
                {scope === 'all' ? t('commandHistory.allTimeHint') : t('commandDetail.historyHint')}
            </p>
        </div>
    ) : (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
                {scope === 'all' ? t('commandHistory.allTimeHint') : t('commandDetail.historyHint')} {t('commandDetail.historyCount', { count: total })}
            </p>
            <div className="rounded-xl border bg-muted/40 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {!commandName ? <TableHead>{t('commandHistory.command')}</TableHead> : null}
                            <TableHead>{t('commandDetail.historyUser')}</TableHead>
                            <TableHead>{t('commandDetail.historyChat')}</TableHead>
                            <TableHead>{t('commandDetail.historyWhen')}</TableHead>
                            <TableHead>{t('commandDetail.historyArgs')}</TableHead>
                            <TableHead>{t('commandDetail.historyResult')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((entry, index) => (
                            <TableRow key={`${entry.timestamp}-${entry.command}-${index}`}>
                                {!commandName ? (
                                    <TableCell className="font-mono text-sm">{entry.command || '—'}</TableCell>
                                ) : null}
                                <TableCell className="font-medium">{entry.username || '—'}</TableCell>
                                <TableCell className="text-xs">{entry.typeChat || '—'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                                </TableCell>
                                <TableCell className="text-xs max-w-[240px] truncate" title={formatCommandArgs(entry.args)}>
                                    {formatCommandArgs(entry.args) || '—'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={entry.success ? 'secondary' : 'destructive'}>
                                        {entry.success ? t('commandDetail.historyOk') : t('commandDetail.historyFail')}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );

    return body;
}

export default function CommandHistoryList({ botId, commandName, embedded = false }) {
    const { t } = useTranslation('management');
    const tabs = (
        <Tabs defaultValue="session" className="space-y-3">
            <TabsList>
                <TabsTrigger value="session">{t('commandHistory.sinceStart')}</TabsTrigger>
                <TabsTrigger value="all">{t('commandHistory.allTime')}</TabsTrigger>
            </TabsList>
            <TabsContent value="session">
                <HistoryTable botId={botId} commandName={commandName} scope="session" />
            </TabsContent>
            <TabsContent value="all">
                <HistoryTable botId={botId} commandName={commandName} scope="all" />
            </TabsContent>
        </Tabs>
    );

    if (embedded) return tabs;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight">{t('commandHistory.title')}</CardTitle>
                <CardDescription>{t('commandHistory.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto">{tabs}</CardContent>
        </Card>
    );
}
