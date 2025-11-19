import React, { useEffect, useRef } from 'react';
import Editor, { useMonaco } from "@monaco-editor/react";
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileIcon from './FileIcon';

const Tab = ({ file, isActive, onClick, onClose, isDirty }) => (
    <div
        className={cn(
            "group relative flex items-center h-9 px-3 border-r border-border min-w-[120px] max-w-[200px] cursor-pointer select-none text-sm transition-colors",
            isActive ? "bg-background text-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
        )}
        onClick={onClick}
        title={file.path}
    >
        <span className="truncate flex-grow mr-2 flex items-center gap-2">
            <FileIcon name={file.name} className="h-4 w-4" />
            {file.name}
        </span>
        <div className="flex items-center">
            {isDirty && (
                <div className="w-2 h-2 rounded-full bg-primary mr-2 group-hover:hidden" />
            )}
            <div
                className={cn(
                    "opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted-foreground/20",
                    isDirty ? "block" : ""
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(file);
                }}
            >
                <X className="h-3 w-3" />
            </div>
        </div>
        {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />}
    </div>
);

export default function EditorGroup({
    files,
    activeFile,
    onSelectFile,
    onCloseFile,
    onSaveFile,
    unsavedFiles,
    onContentChange,
    onProblemsChange,
    onHighlightLines
}) {
    const monaco = useMonaco();
    const editorRef = useRef(null);
    const decorationsRef = useRef([]);

    const getLanguage = (filename) => {
        if (!filename) return 'plaintext';
        const extension = filename.split('.').pop();
        switch (extension) {
            case 'js': return 'javascript';
            case 'jsx': return 'javascript';
            case 'ts': return 'typescript';
            case 'tsx': return 'typescript';
            case 'json': return 'json';
            case 'md': return 'markdown';
            case 'css': return 'css';
            case 'html': return 'html';
            default: return 'plaintext';
        }
    };

    // Suppress benign Monaco cancellation errors
    useEffect(() => {
        const handler = (event) => {
            if (event.reason && event.reason.type === 'cancelation' && event.reason.msg === 'operation is manually canceled') {
                event.preventDefault();
                // console.debug('Suppressed Monaco cancellation error');
            }
        };
        window.addEventListener('unhandledrejection', handler);
        return () => window.removeEventListener('unhandledrejection', handler);
    }, []);

    const handleEditorWillMount = (monaco) => {

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false, 
            noSyntaxValidation: false,
            diagnosticCodesToIgnore: [
                2304,  // Cannot find module (для плагинов с внешними зависимостями)
                7006,  // Parameter implicitly has 'any' type
                2550,  // Property doesn't exist on type
                80001, // File is a CommonJS module (suggestion для конвертации в ES module)
            ]
        });

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2017,  // ES2017 для Object.entries и др.
            allowNonTsExtensions: true,
            checkJs: false,  // Отключаем строгую проверку типов для JS
            allowJs: true,
            lib: ['es2017']  // Добавляем библиотеку ES2017
        });

        const libSource = `
            declare class Bot {
                chat(message: string): void;
                whisper(username: string, message: string): void;
                username: string;
                entity: any;
                entities: any;
                players: any;
            }
            declare const bot: Bot;
            declare const module: { exports: any };
            declare const require: (module: string) => any;
        `;

        const libUri = 'ts:filename/bot.d.ts';
        monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUri);
    };

    const activeFileRef = useRef(activeFile);

    useEffect(() => {
        activeFileRef.current = activeFile;
    }, [activeFile]);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;

        // Add Save Command (Ctrl+S)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (activeFileRef.current) {
                onSaveFile(activeFileRef.current);
            }
        });
    };

    // Global keyboard handler for Russian layout (Ctrl+Ы)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'ы') {
                e.preventDefault();
                if (activeFileRef.current) {
                    onSaveFile(activeFileRef.current);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onSaveFile]);

    useEffect(() => {
        const handleRevealLine = (event) => {
            if (editorRef.current && event.detail?.line) {
                const lineNumber = event.detail.line;
                editorRef.current.revealLineInCenter(lineNumber);
                editorRef.current.setPosition({ lineNumber, column: 1 });
                editorRef.current.focus();
            }
        };

        window.addEventListener('revealLine', handleRevealLine);

        return () => {
            window.removeEventListener('revealLine', handleRevealLine);
        };
    }, []);

    // Expose highlightLines function via ref
    const highlightLines = useRef((lineRanges) => {
        if (!editorRef.current || !lineRanges || lineRanges.length === 0) {
            console.log('[EditorGroup] Cannot highlight - no editor or empty ranges');
            return;
        }

        console.log('[EditorGroup] Highlighting lines:', lineRanges);

        // Очищаем предыдущие decorations
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);

        // Создаём новые decorations для каждого диапазона
        const newDecorations = lineRanges.map(range => ({
            range: {
                startLineNumber: range.start,
                startColumn: 1,
                endLineNumber: range.end,
                endColumn: 1
            },
            options: {
                isWholeLine: true,
                className: 'ai-changed-line',
                glyphMarginClassName: 'ai-changed-glyph',
                overviewRuler: {
                    color: 'rgba(34, 197, 94, 0.4)',
                    position: 2
                },
                minimap: {
                    color: 'rgba(34, 197, 94, 0.4)',
                    position: 2
                }
            }
        }));

        decorationsRef.current = editorRef.current.deltaDecorations([], newDecorations);
        console.log('[EditorGroup] Decorations applied:', decorationsRef.current);

        // Автоматически убираем подсветку через 5 секунд
        setTimeout(() => {
            if (editorRef.current) {
                decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
                console.log('[EditorGroup] Decorations cleared');
            }
        }, 15000);
    });

    useEffect(() => {
        if (onHighlightLines) {
            onHighlightLines(highlightLines.current);
        }
    }, [onHighlightLines]);

    useEffect(() => {
        if (!monaco || !onProblemsChange) return;

        const collectProblems = () => {
            const allModels = monaco.editor.getModels();
            const problems = [];

            allModels.forEach(model => {
                const uri = model.uri;
                const markers = monaco.editor.getModelMarkers({ resource: uri });

                markers.forEach(marker => {
                    problems.push({
                        file: uri.path,
                        severity: marker.severity,
                        message: marker.message,
                        startLineNumber: marker.startLineNumber,
                        startColumn: marker.startColumn,
                        endLineNumber: marker.endLineNumber,
                        endColumn: marker.endColumn,
                    });
                });
            });

            onProblemsChange(problems);
        };

        const initialTimer = setTimeout(() => {
            collectProblems();
        }, 1000);

        const disposable = monaco.editor.onDidChangeMarkers(() => {
            collectProblems();
        });

        return () => {
            clearTimeout(initialTimer);
            disposable.dispose();
        };
    }, [monaco, onProblemsChange]);

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            {/* Tabs Header */}
            <div className="flex items-center bg-[#252526] overflow-x-auto scrollbar-hide">
                {files.map(file => (
                    <Tab
                        key={file.path}
                        file={file}
                        isActive={activeFile && activeFile.path === file.path}
                        onClick={() => onSelectFile(file)}
                        onClose={onCloseFile}
                        isDirty={unsavedFiles.has(file.path)}
                    />
                ))}
            </div>

            {/* Editor Area */}
            <div className="flex-grow relative">
                {files.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <div className="text-2xl font-semibold mb-2">BlockMine Studio</div>
                            <div className="text-sm">Выберите файл для редактированиЯ</div>
                        </div>
                    </div>
                ) : (
                    activeFile && (
                        <Editor
                            height="100%"
                            path={activeFile.path}
                            defaultLanguage={getLanguage(activeFile.name)}
                            value={activeFile.content}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: true },
                                fontSize: 14,
                                wordWrap: 'on',
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                padding: { top: 10 }
                            }}
                            beforeMount={handleEditorWillMount}
                            onMount={handleEditorDidMount}
                            onChange={(value) => {
                                if (onContentChange && activeFile) {
                                    onContentChange(activeFile.path, value);
                                }
                            }}
                        />
                    )
                )}
            </div>
        </div>
    );
}
