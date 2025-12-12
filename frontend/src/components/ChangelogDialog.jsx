import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

function parseChangelog(markdownText) {
    if (!markdownText || typeof markdownText !== 'string') return [];

    const lines = markdownText.split('\n');
    const releases = [];
    let current = null;

    const startNew = (headerLine) => {
        if (current) {
            current.body = current.bodyLines.join('\n').trim();
            current.hasBreaking = /breaking change|breaking|⚠️|!:|\*\*breaking\*\*/i.test(current.body);
            releases.push(current);
        }
        const m = headerLine.match(/^#{2,3}\s*\[?v?([0-9]+(?:\.[0-9]+){1,2}(?:-[0-9A-Za-z.-]+)?)\]?\s*(?:[-(]\s*([^\n)]+)\)?)?\s*$/i);
        const version = m?.[1] || headerLine.replace(/^#{2,3}\s*/, '').trim();
        const date = m?.[2]?.trim() || '';
        current = { version, date, bodyLines: [] };
    };

    for (const line of lines) {
        if (line.startsWith('## ')) {
            startNew(line);
        } else if (line.startsWith('### ')) {
            const isSemverHeader = /^#{3}\s*\[?v?\d+(?:\.[0-9]+){1,2}(?:-[0-9A-Za-z.-]+)?\]?/.test(line);
            if (isSemverHeader) {
                startNew(line);
            } else {
                if (!current) continue;
                current.bodyLines.push(line);
            }
        } else {
            if (!current) continue;
            current.bodyLines.push(line);
        }
    }
    if (current) {
        current.body = current.bodyLines.join('\n').trim();
        current.hasBreaking = /breaking change|breaking|⚠️|!:|\*\*breaking\*\*/i.test(current.body);
        releases.push(current);
    }

    return releases;
}

export default function ChangelogDialog() {
    const { t } = useTranslation('dialogs');
    const showChangelogDialog = useAppStore(state => state.showChangelogDialog);
    const changelog = useAppStore(state => state.changelog);
    const appVersion = useAppStore(state => state.appVersion);
    const closeChangelogDialog = useAppStore(state => state.closeChangelogDialog);

    const releases = useMemo(() => parseChangelog(changelog), [changelog]);

    const [expanded, setExpanded] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState('');

    useEffect(() => {
        const lastShown = localStorage.getItem('lastShownVersion') || '';
        if (releases.length === 0) {
            setExpanded([]);
            setSelectedVersion('');
            return;
        }

        if (!lastShown) {
            const initial = releases.slice(0, 2).map(r => r.version);
            setExpanded(initial);
            setSelectedVersion(releases[0]?.version || '');
            return;
        }

        const idx = releases.findIndex(r => r.version === lastShown);
        const versionsToExpand = idx === -1
            ? releases.map(r => r.version)
            : releases.slice(0, Math.max(0, idx)).map(r => r.version);

        if (versionsToExpand.length > 0) {
            setExpanded(versionsToExpand);
        } else {
            setExpanded([releases[0].version]);
        }
        setSelectedVersion(releases[0].version);
    }, [releases]);

    const handleAccordionChange = (value) => {
        if (Array.isArray(value)) setExpanded(value);
    };

    const handleJumpToVersion = (v) => {
        setSelectedVersion(v);
        if (!expanded.includes(v)) setExpanded(prev => [...prev, v]);
        setTimeout(() => {
            const el = document.getElementById(`release-${v}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    };

    return (
        <Dialog open={showChangelogDialog} onOpenChange={closeChangelogDialog}>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('changelog.title', { version: appVersion })}</DialogTitle>
                </DialogHeader>

                <div className="flex items-center justify-end border rounded-lg p-3">
                    <Select value={selectedVersion} onValueChange={handleJumpToVersion}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('changelog.selectVersion')} />
                        </SelectTrigger>
                        <SelectContent>
                            {releases.map(r => (
                                <SelectItem key={r.version} value={r.version}>{r.version}{r.date ? ` — ${r.date}` : ''}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <ScrollArea className="flex-1 w-full rounded-md border p-2 md:p-3">
                    {releases.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">{t('changelog.noData')}</div>
                    ) : (
                        <Accordion type="multiple" value={expanded} onValueChange={handleAccordionChange} className="w-full">
                            {releases.map((r) => (
                                <AccordionItem key={r.version} value={r.version} id={`release-${r.version}`} className="border rounded-lg mb-3">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold">{r.version}</span>
                                                {r.date && <span className="text-sm text-muted-foreground">{r.date}</span>}
                                                {r.hasBreaking && (
                                                    <Badge variant="destructive" className="flex items-center gap-1">
                                                        <AlertTriangle className="h-3.5 w-3.5" /> breaking
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                                                    p: ({ children }) => <p className="mb-4">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-4">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-4">{children}</ol>,
                                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                                    code: ({ inline, children }) => {
                                                        if (inline) {
                                                            return <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{children}</code>;
                                                        }
                                                        return (
                                                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                                                                <code>{children}</code>
                                                            </pre>
                                                        );
                                                    },
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-4">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                    hr: () => <hr className="my-8 border-muted-foreground/30" />,
                                                    a: ({ href, children }) => (
                                                        <a 
                                                            href={href} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline"
                                                        >
                                                            {children}
                                                        </a>
                                                    ),
                                                    table: ({ children }) => (
                                                        <div className="overflow-x-auto mb-4">
                                                            <table className="w-full border-collapse">{children}</table>
                                                        </div>
                                                    ),
                                                    thead: ({ children }) => <thead className="border-b">{children}</thead>,
                                                    tbody: ({ children }) => <tbody>{children}</tbody>,
                                                    tr: ({ children }) => <tr className="border-b">{children}</tr>,
                                                    th: ({ children }) => <th className="text-left p-2 font-semibold">{children}</th>,
                                                    td: ({ children }) => <td className="p-2">{children}</td>,
                                                }}
                                            >
                                                {r.body || t('changelog.noData')}
                                            </ReactMarkdown>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
