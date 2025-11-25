import React, { useMemo } from 'react';
import * as Diff from 'diff';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DiffViewer({ oldContent, newContent, fileName, onClose }) {
    const diffLines = useMemo(() => {
        if (!oldContent || !newContent) return [];

        const changes = Diff.diffLines(oldContent, newContent);
        const lines = [];
        let oldLineNum = 1;
        let newLineNum = 1;

        changes.forEach((change) => {
            const changeLines = change.value.split('\n');
            // Remove last empty line from split
            if (changeLines[changeLines.length - 1] === '') {
                changeLines.pop();
            }

            changeLines.forEach((line) => {
                if (change.added) {
                    lines.push({
                        type: 'added',
                        oldLineNum: null,
                        newLineNum: newLineNum++,
                        content: line
                    });
                } else if (change.removed) {
                    lines.push({
                        type: 'removed',
                        oldLineNum: oldLineNum++,
                        newLineNum: null,
                        content: line
                    });
                } else {
                    lines.push({
                        type: 'unchanged',
                        oldLineNum: oldLineNum++,
                        newLineNum: newLineNum++,
                        content: line
                    });
                }
            });
        });

        return lines;
    }, [oldContent, newContent]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h3 className="font-semibold">Изменения в файле</h3>
                        <p className="text-sm text-muted-foreground">{fileName}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Diff Content */}
                <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-2 gap-0 font-mono text-xs">
                        {/* Old Content Column */}
                        <div className="border-r">
                            <div className="sticky top-0 bg-muted/50 px-4 py-2 border-b font-semibold">
                                Было
                            </div>
                            <div>
                                {diffLines.map((line, idx) => (
                                    line.type !== 'added' && (
                                        <div
                                            key={idx}
                                            className={`flex ${
                                                line.type === 'removed'
                                                    ? 'bg-red-500/10'
                                                    : 'bg-background'
                                            }`}
                                        >
                                            <div className="w-12 flex-shrink-0 text-right px-2 py-1 text-muted-foreground border-r select-none">
                                                {line.oldLineNum}
                                            </div>
                                            <div className="flex-1 px-2 py-1 whitespace-pre overflow-x-auto">
                                                {line.content || ' '}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>

                        {/* New Content Column */}
                        <div>
                            <div className="sticky top-0 bg-muted/50 px-4 py-2 border-b font-semibold">
                                Стало
                            </div>
                            <div>
                                {diffLines.map((line, idx) => (
                                    line.type !== 'removed' && (
                                        <div
                                            key={idx}
                                            className={`flex ${
                                                line.type === 'added'
                                                    ? 'bg-green-500/10'
                                                    : 'bg-background'
                                            }`}
                                        >
                                            <div className="w-12 flex-shrink-0 text-right px-2 py-1 text-muted-foreground border-r select-none">
                                                {line.newLineNum}
                                            </div>
                                            <div className="flex-1 px-2 py-1 whitespace-pre overflow-x-auto">
                                                {line.content || ' '}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with stats */}
                <div className="border-t px-4 py-3 bg-muted/30">
                    <div className="flex gap-4 text-sm">
                        <span className="text-green-500">
                            +{diffLines.filter(l => l.type === 'added').length} добавлено
                        </span>
                        <span className="text-red-500">
                            -{diffLines.filter(l => l.type === 'removed').length} удалено
                        </span>
                        <span className="text-muted-foreground">
                            {diffLines.filter(l => l.type === 'unchanged').length} без изменений
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
