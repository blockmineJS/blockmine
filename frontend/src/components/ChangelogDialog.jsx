import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

export default function ChangelogDialog() {
    const showChangelogDialog = useAppStore(state => state.showChangelogDialog);
    const changelog = useAppStore(state => state.changelog);
    const appVersion = useAppStore(state => state.appVersion);
    const closeChangelogDialog = useAppStore(state => state.closeChangelogDialog);
    
    return (
        <Dialog open={showChangelogDialog} onOpenChange={closeChangelogDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Что нового в версии {appVersion}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 w-full rounded-md border p-4">
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
                            {changelog || 'Нет данных для отображения'}
                        </ReactMarkdown>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
