import React, { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, FileText } from 'lucide-react';
import FileIcon from './FileIcon';

const SeverityIcon = ({ severity }) => {
    switch (severity) {
        case 8: // Error
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 4: // Warning
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        case 2: // Info
        case 1: // Hint
            return <Info className="h-4 w-4 text-blue-500" />;
        default:
            return <Info className="h-4 w-4 text-muted-foreground" />;
    }
};

const getSeverityLabel = (severity) => {
    switch (severity) {
        case 8: return 'Error';
        case 4: return 'Warning';
        case 2: return 'Info';
        case 1: return 'Hint';
        default: return 'Unknown';
    }
};

const ProblemRow = ({ problem, onClick }) => {
    return (
        <div
            className="flex items-start gap-3 px-4 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors"
            onClick={onClick}
        >
            <div className="flex-shrink-0 mt-0.5">
                <SeverityIcon severity={problem.severity} />
            </div>

            <div className="flex-grow min-w-0">
                <div className="text-sm font-medium text-foreground mb-1 break-words">
                    {problem.message}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileIcon name={problem.file} className="h-3 w-3" />
                    <span className="truncate">{problem.file}</span>
                    <span className="text-primary">
                        [{problem.startLineNumber}:{problem.startColumn}]
                    </span>
                    {problem.source && (
                        <span className="text-muted-foreground/70">({problem.source})</span>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 text-xs text-muted-foreground">
                {getSeverityLabel(problem.severity)}
            </div>
        </div>
    );
};

export default function ProblemsPanel({ problems = [], onProblemClick }) {
    // Group and count problems by severity
    const stats = useMemo(() => {
        return problems.reduce((acc, p) => {
            if (p.severity === 8) acc.errors++;
            else if (p.severity === 4) acc.warnings++;
            else acc.info++;
            return acc;
        }, { errors: 0, warnings: 0, info: 0 });
    }, [problems]);

    // Sort problems: errors first, then warnings, then info
    const sortedProblems = useMemo(() => {
        return [...problems].sort((a, b) => {
            // Sort by severity (higher severity first)
            if (a.severity !== b.severity) {
                return b.severity - a.severity;
            }
            // Then by file name
            if (a.file !== b.file) {
                return a.file.localeCompare(b.file);
            }
            // Then by line number
            return a.startLineNumber - b.startLineNumber;
        });
    }, [problems]);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header with stats */}
            <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/20 text-xs">
                {stats.errors > 0 && (
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="font-medium">{stats.errors}</span>
                    </div>
                )}
                {stats.warnings > 0 && (
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                        <span className="font-medium">{stats.warnings}</span>
                    </div>
                )}
                {stats.info > 0 && (
                    <div className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium">{stats.info}</span>
                    </div>
                )}
                {problems.length === 0 && (
                    <span className="text-muted-foreground">No problems</span>
                )}
            </div>

            {/* Problems list */}
            <div className="flex-grow overflow-y-auto">
                {problems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                        <FileText className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">No problems detected</p>
                        <p className="text-xs mt-1 opacity-70">
                            Errors and warnings will appear here
                        </p>
                    </div>
                ) : (
                    sortedProblems.map((problem, index) => (
                        <ProblemRow
                            key={`${problem.file}-${problem.startLineNumber}-${problem.startColumn}-${index}`}
                            problem={problem}
                            onClick={() => onProblemClick?.(problem)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
