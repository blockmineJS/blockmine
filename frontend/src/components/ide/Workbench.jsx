import React, { useState, useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ActivityBar from './ActivityBar';
import Sidebar from './Sidebar';
import EditorGroup from './EditorGroup';
import Panel from './Panel';
import StatusBar from './StatusBar';
import Terminal from './Terminal';
import QuickOpen from './QuickOpen';
import AIAssistantChat from './AIAssistantChat';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

export default function Workbench({
    botId,
    pluginName,
    files,
    activeFile,
    onSelectFile,
    onCloseFile,
    onSaveFile,
    fileStructure,
    unsavedFiles,
    onFileOperation,
    onContentChange,
    onOpenFileAtLine
}) {
    const [activeView, setActiveView] = useState('explorer');
    const [showPanel, setShowPanel] = useState(true);
    const [panelSize, setPanelSize] = useState(20);
    const [activePanel, setActivePanel] = useState('terminal');
    const [showSidebar, setShowSidebar] = useState(true);
    const [quickOpenVisible, setQuickOpenVisible] = useState(false);
    const [problems, setProblems] = useState([]);
    const [showAIChat, setShowAIChat] = useState(false);
    const highlightLinesCallbackRef = useRef(null);

    const handleProblemClick = (problem) => {
        if (!onOpenFileAtLine) return;

        const matchingTab = files.find(f => {
            const problemFileName = problem.file.replace(/^\//, '');
            return f.path.endsWith(problemFileName) || f.path === problemFileName;
        });

        if (matchingTab) {
            onOpenFileAtLine(matchingTab.path, problem.startLineNumber);
        } else {
            onOpenFileAtLine(problem.file, problem.startLineNumber);
        }
    };

    const handleAIFileUpdate = (filePath, newContent, oldContent, changedLineRanges) => {

        if (newContent === null && oldContent === null && !changedLineRanges) {
            const file = files.find(f => f.path === filePath || f.path.endsWith(filePath));
            if (file) {
                onCloseFile(file);
            }
            if (onFileOperation?.onRefresh) {
                setTimeout(() => {
                    onFileOperation.onRefresh();
                }, 300);
            }
            return;
        }

        const file = files.find(f => f.path === filePath || f.path.endsWith(filePath));

        if (newContent === null) {
            if (file) {
                onSelectFile(file);
            } else {
                onSelectFile({ path: filePath });
            }
        } else if (file) {
            onContentChange(file.path, newContent);

            // Подсвечиваем изменения если есть старое содержимое
            if (oldContent !== undefined && oldContent !== newContent && changedLineRanges) {
                if (highlightLinesCallbackRef.current) {
                    setTimeout(() => {
                        highlightLinesCallbackRef.current(changedLineRanges);
                    }, 200);
                }
            }

        } else {

            // Извлекаем имя файла из пути
            const fileName = filePath.split('/').pop();

            onSelectFile({
                path: filePath,
                name: fileName,
                content: newContent
            });
            if (oldContent === '') {
                if (onFileOperation?.onRefresh) {
                    setTimeout(() => {
                        onFileOperation.onRefresh();
                    }, 500); // Небольшая задержка чтобы файл успел создаться
                }
            }
        }
    };

    useKeyboardShortcuts({
        onToggleSidebar: () => setShowSidebar(prev => !prev),
        onTogglePanel: () => setShowPanel(prev => !prev),
        onOpenSearch: () => setActiveView('search'),
        onOpenExplorer: () => setActiveView('explorer'),
        onQuickOpen: () => setQuickOpenVisible(true),
        onSaveFile: () => {
            if (activeFile) {
                onSaveFile(activeFile);
            }
        },
        onCloseActiveTab: () => {
            if (activeFile) {
                onCloseFile(activeFile);
            }
        },
        onNextTab: () => {
            if (files.length > 0) {
                const currentIndex = files.findIndex(f => f.path === activeFile?.path);
                const nextIndex = (currentIndex + 1) % files.length;
                onSelectFile(files[nextIndex]);
            }
        },
        onPrevTab: () => {
            if (files.length > 0) {
                const currentIndex = files.findIndex(f => f.path === activeFile?.path);
                const prevIndex = currentIndex === 0 ? files.length - 1 : currentIndex - 1;
                onSelectFile(files[prevIndex]);
            }
        },
        onNewFile: () => {
            onFileOperation?.onCreateFile({ path: '', type: 'folder', name: 'root' });
        },
    });

    return (
        <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
            {/* Activity Bar (Leftmost) */}
            <ActivityBar activeView={activeView} onViewChange={setActiveView} />

            {/* Quick Open Dialog */}
            <QuickOpen
                isOpen={quickOpenVisible}
                onClose={() => setQuickOpenVisible(false)}
                fileStructure={fileStructure}
                onSelectFile={onSelectFile}
            />

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="flex-grow">

                    {/* Sidebar (Explorer, Search, etc.) */}
                    {showSidebar && (
                        <>
                            <ResizablePanel
                                defaultSize={20}
                                minSize={15}
                                maxSize={30}
                                collapsible={true}
                                className="border-r bg-muted/10"
                            >
                        <Sidebar
                            activeView={activeView}
                            fileStructure={fileStructure}
                            onSelectFile={onSelectFile}
                            activeFile={activeFile}
                            onFileOperation={onFileOperation}
                            botId={botId}
                            pluginName={pluginName}
                            onOpenFileAtLine={onOpenFileAtLine}
                        />
                            </ResizablePanel>

                            <ResizableHandle />
                        </>
                    )}

                    {/* Editor & Panel Area */}
                    <ResizablePanel defaultSize={80}>
                        <ResizablePanelGroup direction="vertical">

                            {/* Editor Group */}
                            <ResizablePanel defaultSize={showPanel ? 70 : 100} className="bg-background">
                                <EditorGroup
                                    files={files}
                                    activeFile={activeFile}
                                    onSelectFile={onSelectFile}
                                    onCloseFile={onCloseFile}
                                    onSaveFile={onSaveFile}
                                    unsavedFiles={unsavedFiles}
                                    onContentChange={onContentChange}
                                    onProblemsChange={setProblems}
                                    onHighlightLines={(fn) => { highlightLinesCallbackRef.current = fn; }}
                                    botId={botId}
                                />
                            </ResizablePanel>

                            {/* Bottom Panel (Terminal, etc.) */}
                            {showPanel && (
                                <>
                                    <ResizableHandle />
                                    <ResizablePanel
                                        defaultSize={30}
                                        minSize={10}
                                        onResize={setPanelSize}
                                        className="border-t bg-muted/30"
                                    >
                                        <Panel
                                            activePanel={activePanel}
                                            onPanelChange={setActivePanel}
                                            botId={botId}
                                            pluginName={pluginName}
                                            problems={problems}
                                            onProblemClick={handleProblemClick}
                                        />
                                    </ResizablePanel>
                                </>
                            )}
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>

                {/* Status Bar */}
                <StatusBar
                    botId={botId}
                    pluginName={pluginName}
                    activeFile={activeFile}
                    showPanel={showPanel}
                    onTogglePanel={() => setShowPanel(!showPanel)}
                    problems={problems}
                    onProblemsClick={() => {
                        setShowPanel(true);
                        setActivePanel('problems');
                    }}
                    showAIChat={showAIChat}
                    onToggleAIChat={() => setShowAIChat(!showAIChat)}
                />
            </div>

            {/* AI Assistant Panel - Right Side */}
            {showAIChat && (
                <div className="w-96 h-full border-l">
                    <AIAssistantChat
                        botId={botId}
                        pluginName={pluginName}
                        onClose={() => setShowAIChat(false)}
                        onFileUpdated={handleAIFileUpdate}
                    />
                </div>
            )}
        </div>
    );
}
