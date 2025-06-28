import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { useVisualEditorStore } from '@/stores/visualEditorStore';
import VisualEditor from '@/components/visual-editor/VisualEditorPage';
import NodePanel from '@/components/visual-editor/NodePanel';
import SettingsPanel from '@/components/visual-editor/SettingsPanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

import { Button } from "@/components/ui/button";

const VisualEditorPage = () => {
  const { botId, commandId } = useParams();
  const { init, isLoading, command, saveGraph, isSaving } = useVisualEditorStore();

  useEffect(() => {
    if (botId && commandId) {
      init(botId, commandId);
    }
  }, [botId, commandId, init]);

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

