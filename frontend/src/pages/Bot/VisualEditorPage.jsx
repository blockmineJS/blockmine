import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { useVisualEditorStore } from '@/stores/visualEditorStore';
import VisualEditor from '@/components/visual-editor/VisualEditorPage';
import NodePanel from '@/components/visual-editor/NodePanel';
import SettingsPanel from '@/components/visual-editor/SettingsPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

import { Button } from "@/components/ui/button";

const VisualEditorPage = () => {
  const { botId, commandId, eventId } = useParams();
  const location = useLocation();
  const { init, isLoading, command, saveGraph, isSaving } = useVisualEditorStore();

  useEffect(() => {
    const editorType = location.pathname.includes('/commands/') ? 'command' : 'event';
    const id = editorType === 'command' ? commandId : eventId;
    
    if (botId && id) {
      init(botId, id, editorType);
    }
  }, [botId, commandId, eventId, location.pathname, init]);

  if (isLoading) {
    return <div>Загрузка редактора...</div>;
  }

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col">
        <header className="p-2 border-b flex justify-between items-center">
          <h1 className="text-lg font-bold">Редактор: {command?.name}</h1>
          <Button onClick={() => saveGraph(botId)} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </header>
        <ResizablePanelGroup direction="horizontal" className="flex-grow">
          <ResizablePanel defaultSize={20}>
            <NodePanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
      <VisualEditor />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={20}>
            <SettingsPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ReactFlowProvider>
  );
};

export default VisualEditorPage;

