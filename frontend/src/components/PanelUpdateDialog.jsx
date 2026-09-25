import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ArrowRight,
    Download,
    GitCommit,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function formatStamp(value, locale) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function VersionCard({ label, version, sha, branch, message, date, locale, accent }) {
    return (
        <div
            className={cn(
                'relative min-w-0 flex-1 overflow-hidden rounded-xl border p-4',
                accent
                    ? 'border-primary/40 bg-primary/5 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.15)]'
                    : 'border-border bg-muted/40'
            )}
        >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {label}
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">
                {version ? `v${version}` : '—'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={accent ? 'default' : 'outline'} className="font-mono text-[11px]">
                    {sha || '—'}
                </Badge>
                {branch ? (
                    <span className="text-xs text-muted-foreground">{branch}</span>
                ) : null}
            </div>
            {message ? (
                <p className="mt-3 line-clamp-2 text-sm leading-snug text-foreground/90">{message}</p>
            ) : null}
            {date ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{formatStamp(date, locale)}</p>
            ) : null}
        </div>
    );
}

export default function PanelUpdateDialog() {
    const { t, i18n } = useTranslation('dialogs');
    const { toast } = useToast();
    const locale = i18n.language;
    const open = useAppStore((state) => state.showPanelUpdateDialog);
    const info = useAppStore((state) => state.panelUpdate);
    const progress = useAppStore((state) => state.panelUpdateProgress);
    const checking = useAppStore((state) => state.panelUpdateChecking);
    const applying = useAppStore((state) => state.panelUpdateApplying);
    const waiting = useAppStore((state) => state.panelUpdateWaiting);
    const hasPermission = useAppStore((state) => state.hasPermission);
    const setShowPanelUpdateDialog = useAppStore((state) => state.setShowPanelUpdateDialog);
    const applyPanelUpdate = useAppStore((state) => state.applyPanelUpdate);
    const canEdit = hasPermission('panel:settings:edit');
    const busy = applying || waiting;
    const stage = progress?.stage || (waiting ? 'restarting' : '');

    useEffect(() => {
        if (!waiting) return undefined;
        let cancelled = false;
        const tick = async () => {
            try {
                const response = await fetch('/api/version', { cache: 'no-store' });
                if (response.ok && !cancelled) {
                    window.location.reload();
                }
            } catch {
                return;
            }
        };
        const intervalId = setInterval(tick, 2000);
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
        }, 180000);
        return () => {
            cancelled = true;
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [waiting]);

    const commits = info?.commits || [];
    const reasonKey = info?.reason ? `panelUpdate.reason.${info.reason}` : '';
    const reasonText = info?.reason ? t(reasonKey) : '';

    const stageLabel = useMemo(() => {
        if (!stage || stage === 'idle') return '';
        return t(`panelUpdate.stages.${stage}`, { defaultValue: stage });
    }, [stage, t]);

    useEffect(() => {
        if (!applying && !waiting && !sessionStorage.getItem('blockmine-panel-updating')) {
            return undefined;
        }
        let cancelled = false;
        const pollStatus = async () => {
            try {
                const token = useAppStore.getState().token;
                const response = await fetch('/api/panel/update/status', {
                    cache: 'no-store',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok || cancelled) return;
                const payload = await response.json();
                useAppStore.setState({
                    panelUpdateProgress: payload,
                    panelUpdateApplying: payload.stage && payload.stage !== 'idle' && payload.stage !== 'done' && payload.stage !== 'error',
                    panelUpdateWaiting: payload.stage === 'restarting' ? true : useAppStore.getState().panelUpdateWaiting,
                });
                if (payload.stage === 'error') {
                    sessionStorage.removeItem('blockmine-panel-updating');
                }
            } catch {
                return;
            }
        };
        pollStatus();
        const intervalId = setInterval(pollStatus, 1000);
        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [applying, waiting]);

    const handleApply = async () => {
        try {
            sessionStorage.setItem('blockmine-panel-updating', '1');
            await applyPanelUpdate();
        } catch (error) {
            sessionStorage.removeItem('blockmine-panel-updating');
            toast({
                title: t('panelUpdate.applyError'),
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setShowPanelUpdateDialog}>
            <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
                <div className="border-b bg-[radial-gradient(1200px_circle_at_0%_0%,hsl(var(--primary)/0.16),transparent_42%)] px-6 pb-5 pt-6">
                    <DialogHeader className="space-y-2 text-left">
                        <DialogTitle className="text-xl">
                            {info?.updateAvailable ? t('panelUpdate.title') : t('panelUpdate.upToDate')}
                        </DialogTitle>
                        <DialogDescription>
                            {info?.updateAvailable
                                ? t(info.restartMethod === 'pm2' ? 'panelUpdate.subtitlePm2' : 'panelUpdate.subtitle')
                                : t('panelUpdate.subtitleIdle')}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="space-y-5 px-6 py-5">
                    {checking && !info ? (
                        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('panelUpdate.checking')}
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                                <VersionCard
                                    label={t('panelUpdate.current')}
                                    version={info?.current?.version}
                                    sha={info?.current?.shortSha}
                                    branch={info?.current?.branch}
                                    message={info?.current?.message}
                                    date={info?.current?.date}
                                    locale={locale}
                                />
                                <div className="hidden shrink-0 text-muted-foreground sm:block">
                                    <ArrowRight className="h-5 w-5" />
                                </div>
                                <VersionCard
                                    label={t('panelUpdate.latest')}
                                    version={info?.latest?.version}
                                    sha={info?.latest?.shortSha}
                                    branch={info?.latest?.branch}
                                    message={info?.latest?.message}
                                    date={info?.latest?.date}
                                    locale={locale}
                                    accent
                                />
                            </div>

                            {commits.length > 0 ? (
                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium">{t('panelUpdate.whatsNew')}</p>
                                        <span className="text-xs text-muted-foreground">
                                            {t('panelUpdate.commitCount', { count: info?.behindBy || commits.length })}
                                        </span>
                                    </div>
                                    <ScrollArea className="h-[180px] rounded-lg border">
                                        <ul className="divide-y">
                                            {commits.map((commit) => (
                                                <li key={commit.sha} className="flex items-start gap-3 px-3 py-2.5">
                                                    <GitCommit className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm">{commit.message}</p>
                                                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                                            {commit.shortSha}
                                                            {commit.author ? ` · ${commit.author}` : ''}
                                                            {commit.date ? ` · ${formatStamp(commit.date, locale)}` : ''}
                                                        </p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </div>
                            ) : info?.updateAvailable ? (
                                <p className="text-sm text-muted-foreground">{t('panelUpdate.noCommits')}</p>
                            ) : null}

                            {reasonText && info?.reason && info.reason !== 'same' ? (
                                <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                                    {reasonText}
                                </p>
                            ) : null}

                            {busy ? (
                                <div className="space-y-3 rounded-xl border bg-card p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            {stageLabel || t('panelUpdate.updating')}
                                        </div>
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {progress?.percent || 0}%
                                        </span>
                                    </div>
                                    <Progress value={progress?.percent || (waiting ? 100 : 8)} />
                                    {waiting ? (
                                        <p className="text-sm text-muted-foreground">
                                            {t(info?.restartMethod === 'pm2' ? 'panelUpdate.restartingPm2' : 'panelUpdate.restarting')}
                                        </p>
                                    ) : null}
                                    {progress?.log?.length ? (
                                        <pre className="max-h-24 overflow-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
                                            {progress.log.slice(-8).join('\n')}
                                        </pre>
                                    ) : null}
                                </div>
                            ) : null}
                        </>
                    )}
                </div>

                <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                    <Button
                        variant="ghost"
                        onClick={() => setShowPanelUpdateDialog(false)}
                        disabled={busy}
                    >
                        {info?.updateAvailable ? t('panelUpdate.later') : t('panelUpdate.close')}
                    </Button>
                    {info?.updateAvailable ? (
                        <Button onClick={handleApply} disabled={!info?.canUpdate || !canEdit || busy}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            {busy ? t('panelUpdate.updating') : t('panelUpdate.update')}
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
