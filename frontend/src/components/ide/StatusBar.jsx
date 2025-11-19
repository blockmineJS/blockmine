import React, { useState } from 'react';
import { PanelBottom, Keyboard, AlertCircle, AlertTriangle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

export default function StatusBar({ botId, pluginName, activeFile, showPanel, onTogglePanel, problems = [], onProblemsClick, showAIChat, onToggleAIChat }) {
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

    // Count errors and warnings
    const errorCount = problems.filter(p => p.severity === 8).length; // Monaco MarkerSeverity.Error = 8
    const warningCount = problems.filter(p => p.severity === 4).length; // Monaco MarkerSeverity.Warning = 4

    return (
        <>
            <KeyboardShortcutsHelp
                isOpen={showShortcutsHelp}
                onClose={() => setShowShortcutsHelp(false)}
            />
            <div className="h-6 bg-primary text-primary-foreground flex items-center px-2 text-xs select-none justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 font-semibold">
                    <span>Bot: {botId}</span>
                </div>
                {pluginName && (
                    <div className="flex items-center gap-1">
                        <span>Plugin: {pluginName}</span>
                    </div>
                )}
                {activeFile && (
                    <div className="flex items-center gap-1 opacity-80">
                        <span>{activeFile.path}</span>
                    </div>
                )}

                {/* Problems Counter */}
                {(errorCount > 0 || warningCount > 0) && (
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:bg-primary-foreground/20 px-2 py-0.5 rounded"
                        onClick={onProblemsClick}
                        title="Показать проблемы"
                    >
                        {errorCount > 0 && (
                            <div className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-red-400" />
                                <span>{errorCount}</span>
                            </div>
                        )}
                        {warningCount > 0 && (
                            <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                <span>{warningCount}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div
                    className={`cursor-pointer hover:bg-primary-foreground/20 px-1 rounded ${showAIChat ? 'bg-primary-foreground/30' : ''}`}
                    onClick={onToggleAIChat}
                    title="AI Помощник"
                >
                    <Bot className="h-3 w-3" />
                </div>
                <div
                    className="cursor-pointer hover:bg-primary-foreground/20 px-1 rounded"
                    onClick={() => setShowShortcutsHelp(true)}
                    title="Горячие клавиши"
                >
                    <Keyboard className="h-3 w-3" />
                </div>
                <div className="cursor-pointer hover:bg-primary-foreground/20 px-1 rounded" onClick={onTogglePanel}>
                    <PanelBottom className="h-3 w-3" />
                </div>
                <span>UTF-8</span>
                <span>JavaScript</span>
            </div>
        </div>
        </>
    );
}
