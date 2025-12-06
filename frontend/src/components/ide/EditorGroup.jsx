import React, { useEffect, useRef, useState } from 'react';
import Editor, { useMonaco } from "@monaco-editor/react";
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import FileIcon from './FileIcon';
import { AICommandPalette } from './AIAssistant/components/AICommandPalette';
import { useInlineAI } from './AIAssistant/hooks/useInlineAI';
import { useAISettings } from './AIAssistant/hooks/useAISettings';
import { useInlineDiff } from './AIAssistant/hooks/useInlineDiff';
import { subscribeToDiffEvents, emitAcceptDiff, emitRejectDiff } from './AIAssistant/utils/diffEvents';
import './AIAssistant/styles/inline-diff.css';

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
    onHighlightLines,
    botId,
    pluginName
}) {
    const monaco = useMonaco();
    const editorRef = useRef(null);
    const decorationsRef = useRef([]);

    // AI Settings и Inline AI
    const settings = useAISettings();
    const inlineAI = useInlineAI({ botId, pluginName, settings });

    // Inline Diff для preview mode
    const inlineDiff = useInlineDiff();
    const [pendingDiffForFile, setPendingDiffForFile] = useState(null);

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
                6133,  // Variable is declared but its value is never read
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

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
            const position = editor.getPosition();
            const selection = editor.getSelection();
            const model = editor.getModel();

            if (!position || !model) return;

            const coords = editor.getScrolledVisiblePosition(position);
            const editorDom = editor.getDomNode();
            const editorRect = editorDom?.getBoundingClientRect();

            let selectedText = '';
            if (selection && !selection.isEmpty()) {
                selectedText = model.getValueInRange(selection);
            }

            const currentLine = model.getLineContent(position.lineNumber);

            const fileContent = model.getValue();

            inlineAI.open({
                x: (editorRect?.left || 0) + (coords?.left || 0),
                y: (editorRect?.top || 0) + (coords?.top || 0) + 20,
                lineNumber: position.lineNumber,
                column: position.column,
                selectedText,
                currentLine,
                fileContent,
                filePath: activeFileRef.current?.path || ''
            });
        });
    };

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

    // Ref для pendingDiffForFile чтобы избежать переподписок (исправляет event listener leak)
    const pendingDiffForFileRef = useRef(pendingDiffForFile);
    useEffect(() => {
        pendingDiffForFileRef.current = pendingDiffForFile;
    }, [pendingDiffForFile]);

    useEffect(() => {
        const unsubscribe = subscribeToDiffEvents({
            onShowDiff: ({ filePath, oldContent, newContent, changeId }) => {
                console.log('[EditorGroup] Show diff event for:', filePath);
                setPendingDiffForFile({
                    filePath,
                    oldContent,
                    newContent,
                    changeId
                });
            },
            onClearDiff: ({ filePath }) => {
                // Используем ref вместо прямого доступа к state
                if (pendingDiffForFileRef.current?.filePath === filePath) {
                    setPendingDiffForFile(null);
                }
            }
        });

        return unsubscribe;
    }, []); // Убрали зависимость - подписываемся только при mount

    const shownDiffRef = useRef(null);

    useEffect(() => {
        if (!editorRef.current || !monaco || !pendingDiffForFile) return;

        const currentFilePath = activeFile?.path || '';

        if (!currentFilePath.endsWith(pendingDiffForFile.filePath) &&
            pendingDiffForFile.filePath !== currentFilePath) {
            return;
        }

        if (shownDiffRef.current === pendingDiffForFile.changeId) {
            return;
        }

        console.log('[EditorGroup] Showing inline diff for:', pendingDiffForFile.filePath);
        shownDiffRef.current = pendingDiffForFile.changeId;

        inlineDiff.showDiff(
            editorRef.current,
            monaco,
            pendingDiffForFile.filePath,
            pendingDiffForFile.oldContent,
            pendingDiffForFile.newContent,
            // onAccept
            (filePath, newContent) => {
                console.log('[EditorGroup] Diff accepted:', filePath);
                shownDiffRef.current = null;
                emitAcceptDiff(filePath, newContent, pendingDiffForFile.changeId);
                setPendingDiffForFile(null);
            },
            // onReject
            (filePath) => {
                console.log('[EditorGroup] Diff rejected:', filePath);
                shownDiffRef.current = null;
                emitRejectDiff(filePath, pendingDiffForFile.changeId);
                setPendingDiffForFile(null);
            }
        );
    }, [pendingDiffForFile, activeFile, monaco]);

    const highlightLines = useRef((lineRanges) => {
        if (!editorRef.current || !lineRanges || lineRanges.length === 0) {
            console.log('[EditorGroup] Cannot highlight - no editor or empty ranges');
            return;
        }

        console.log('[EditorGroup] Highlighting lines:', lineRanges);

        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);

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

    const handleApplyAIResult = (result) => {
        if (!editorRef.current) return;

        const editor = editorRef.current;
        const selection = editor.getSelection();

        if (selection && !selection.isEmpty()) {
            editor.executeEdits('ai-inline', [{
                range: selection,
                text: result,
                forceMoveMarkers: true
            }]);
        } else {
            const position = editor.getPosition();
            if (position) {
                editor.executeEdits('ai-inline', [{
                    range: {
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    },
                    text: result,
                    forceMoveMarkers: true
                }]);
            }
        }
    };

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
                            <div className="text-sm">Выберите файл для редактирования</div>
                            <div className="text-xs mt-2 text-muted-foreground/60">
                                Нажмите <kbd className="px-1.5 py-0.5 rounded bg-muted">Ctrl+K</kbd> для вызова AI
                            </div>
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

            <AICommandPalette
                isOpen={inlineAI.isOpen}
                position={inlineAI.position}
                context={inlineAI.context}
                isLoading={inlineAI.isLoading}
                result={inlineAI.result}
                error={inlineAI.error}
                onClose={inlineAI.close}
                onSendRequest={inlineAI.sendRequest}
                onApplyResult={handleApplyAIResult}
                actions={inlineAI.actions}
            />
        </div>
    );
}
