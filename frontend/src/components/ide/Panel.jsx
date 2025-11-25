import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Terminal from './Terminal';
import ProblemsPanel from './ProblemsPanel';
import ConsolePanel from './ConsolePanel';
import { X } from 'lucide-react';

export default function Panel({ activePanel, onPanelChange, botId, pluginName, problems, onProblemClick }) {
    return (
        <div className="h-full flex flex-col bg-background border-t">
            <div className="flex items-center justify-between px-2 border-b h-9">
                <Tabs value={activePanel} onValueChange={onPanelChange} className="h-full">
                    <TabsList className="h-full bg-transparent p-0">
                        <TabsTrigger
                            value="terminal"
                            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
                        >
                            КОНСОЛЬ
                        </TabsTrigger>
                        <TabsTrigger
                            value="problems"
                            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
                        >
                            ПРОБЛЕМЫ
                            {problems && problems.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">
                                    {problems.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="output"
                            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4"
                        >
                            ЛОГИ
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                    {/* Close button or other actions could go here */}
                </div>
            </div>
            <div className="flex-grow overflow-hidden relative">
                {activePanel === 'terminal' ? (
                    <Terminal key={`terminal-${botId}`} botId={botId} />
                ) : activePanel === 'problems' ? (
                    <ProblemsPanel problems={problems || []} onProblemClick={onProblemClick} />
                ) : activePanel === 'output' ? (
                    <ConsolePanel botId={botId} pluginName={pluginName} />
                ) : null}
            </div>
        </div>
    );
}
