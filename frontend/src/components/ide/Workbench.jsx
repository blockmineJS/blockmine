import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ActivityBar from './ActivityBar';
import Sidebar from './Sidebar';
import EditorGroup from './EditorGroup';
import Panel from './Panel';
import StatusBar from './StatusBar';
import Terminal from './Terminal';
import QuickOpen from './QuickOpen';
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
                />
            </div>
        </div>
    );
}
