import React, { useMemo, useState, useEffect } from 'react';
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
            <DialogContent className="max-w-5xl h-[90vh] sm:h-[85vh] max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0 pb-2">
                    <DialogTitle className="text-lg sm:text-xl">Что нового в версии {appVersion}</DialogTitle>
                </DialogHeader>

                <div className="shrink-0 flex items-center justify-between sm:justify-end border rounded-lg p-2 sm:p-3 gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground sm:hidden">Версия:</span>
                    <Select value={selectedVersion} onValueChange={handleJumpToVersion}>
                        <SelectTrigger className="w-36 sm:w-44 text-xs sm:text-sm">
                            <SelectValue placeholder="Выбрать версию" />
                        </SelectTrigger>
                        <SelectContent>
                            {releases.map(r => (
                                <SelectItem key={r.version} value={r.version} className="text-xs sm:text-sm">
                                    {r.version}{r.date ? ` — ${r.date}` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <ScrollArea className="flex-1 min-h-0 w-full rounded-md border p-2 sm:p-3 md:p-4">
                    {releases.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">Нет данных для отображения</div>
                    ) : (
                        <Accordion type="multiple" value={expanded} onValueChange={handleAccordionChange} className="w-full space-y-2">
                            {releases.map((r) => (
                                <AccordionItem key={r.version} value={r.version} id={`release-${r.version}`} className="border rounded-lg">
                                    <AccordionTrigger className="px-3 sm:px-4 py-2 sm:py-3 hover:no-underline">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                <span className="font-semibold text-sm sm:text-base">{r.version}</span>
                                                {r.date && <span className="text-xs sm:text-sm text-muted-foreground">{r.date}</span>}
                                                {r.hasBreaking && (
                                                    <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                                        <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                        <span className="hidden sm:inline">breaking</span>
                                                        <span className="sm:hidden">⚠</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ children }) => <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 mt-4 sm:mt-6">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-base sm:text-lg font-medium mb-2 mt-3 sm:mt-4">{children}</h3>,
                                                    p: ({ children }) => <p className="mb-3 sm:mb-4 text-sm sm:text-base">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 sm:mb-4 space-y-1">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 sm:mb-4 space-y-1">{children}</ol>,
                                                    li: ({ children }) => <li className="mb-1 text-sm sm:text-base">{children}</li>,
                                                    code: ({ inline, children }) => {
                                                        if (inline) {
                                                            return <code className="bg-muted px-1.5 py-0.5 rounded text-xs sm:text-sm whitespace-nowrap">{children}</code>;
                                                        }
                                                        return (
                                                            <pre className="bg-muted p-2 sm:p-4 rounded-lg overflow-x-auto mb-3 sm:mb-4 text-xs sm:text-sm">
                                                                <code className="break-all sm:break-normal">{children}</code>
                                                            </pre>
                                                        );
                                                    },
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-2 sm:border-l-4 border-muted-foreground/30 pl-2 sm:pl-4 italic my-3 sm:my-4 text-sm sm:text-base">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                    hr: () => <hr className="my-4 sm:my-8 border-muted-foreground/30" />,
                                                    a: ({ href, children }) => (
                                                        <a
                                                            href={href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline text-sm sm:text-base break-all"
                                                        >
                                                            {children}
                                                        </a>
                                                    ),
                                                    table: ({ children }) => (
                                                        <div className="overflow-x-auto mb-3 sm:mb-4 -mx-2 sm:mx-0">
                                                            <table className="w-full border-collapse text-xs sm:text-sm min-w-max">{children}</table>
                                                        </div>
                                                    ),
                                                    thead: ({ children }) => <thead className="border-b bg-muted/50">{children}</thead>,
                                                    tbody: ({ children }) => <tbody>{children}</tbody>,
                                                    tr: ({ children }) => <tr className="border-b">{children}</tr>,
                                                    th: ({ children }) => <th className="text-left p-1.5 sm:p-2 font-semibold">{children}</th>,
                                                    td: ({ children }) => <td className="p-1.5 sm:p-2">{children}</td>,
                                                }}
                                            >
                                                {r.body || 'Нет данных для отображения'}
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
