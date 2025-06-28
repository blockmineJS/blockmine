import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { ReactFlowProvider } from 'reactflow';
import VisualEditorCanvas from '../../components/visual-editor/VisualEditorCanvas';
import SettingsPanel from '../../components/visual-editor/SettingsPanel';
import NodePanel from '../../components/visual-editor/NodePanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { apiHelper } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import CreateEventGraphDialog from '../../components/visual-editor/CreateEventGraphDialog';
import ShareEventGraphDialog from '../../components/ShareEventGraphDialog';
import ImportEventGraphDialog from '../../components/ImportEventGraphDialog';

function EventGraphsPage() {
  const { botId, eventId } = useParams();

  if (eventId) {
    return <EventGraphEditor botId={botId} eventId={eventId} />;
  } else {
    return <EventGraphList botId={botId} />;
  }
}

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';

import { Badge } from '../../components/ui/badge';

function EventGraphList({ botId }) {
  const [eventGraphs, setEventGraphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [sharingGraphId, setSharingGraphId] = useState(null);

  const fetchEventGraphs = async () => {
    setLoading(true);
    try {
      const graphs = await apiHelper(`/api/bots/${botId}/event-graphs`);
      setEventGraphs(graphs);
    } catch (error) {
      console.error("Не удалось получить графы событий:", error);
    }
    setLoading(false);
  };

  const deleteEventGraph = async (graphId) => {
    try {
      await apiHelper(`/api/bots/${botId}/event-graphs/${graphId}`, { method: 'DELETE' });
      fetchEventGraphs(); // Refresh list after deletion
    } catch (error) {
      console.error("Не удалось удалить граф событий:", error);
    }
  };

  useEffect(() => {
    fetchEventGraphs();
  }, [botId]);

  if (loading) {
    return <div>Загрузка графов событий...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Графы событий</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>Импортировать граф</Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>Создать новый граф</Button>
        </div>
      </div>
      <CreateEventGraphDialog 
        botId={botId} 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
        onCreated={fetchEventGraphs} 
      />
      <ImportEventGraphDialog
        botId={botId}
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportSuccess={() => {
          setIsImportDialogOpen(false);
          fetchEventGraphs();
        }}
      />
      <ShareEventGraphDialog
        botId={botId}
        graphId={sharingGraphId}
        onCancel={() => setSharingGraphId(null)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventGraphs.map(graph => (
          <Card key={graph.id}>
            <CardHeader>
              <CardTitle>{graph.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-between">
              <div>
                <p className="mb-2">Статус: {graph.isEnabled ? 'Включен' : 'Выключен'}</p>
                <div className="flex flex-wrap gap-1">
                    {(graph.triggers || []).map(trigger => (
                        <Badge key={trigger.id} variant="secondary">{trigger.eventType}</Badge>
                    ))}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Link to={`/bots/${botId}/events/visual/${graph.id}`} className="flex-1">
                  <Button className="w-full">Редактировать</Button>
                </Link>
                <Button variant="secondary" onClick={() => setSharingGraphId(graph.id)}>Поделиться</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Удалить</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие необратимо. Граф будет удален навсегда.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteEventGraph(graph.id)}>Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EventGraphEditor({ botId, eventId }) {
  const { init, isLoading, command, saveGraph, isSaving } = useVisualEditorStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    useVisualEditorStore.setState({ nodes: [], edges: [], command: null, isLoading: true });
    const initialize = async () => {
      try {
        await init(botId, eventId, 'event');
      } catch (e) {
        setError(e.message);
        console.error("Не удалось инициализировать редактор графов событий:", e);
      }
    };
    if (botId && eventId) {
      initialize();
    }
    return () => useVisualEditorStore.setState({ nodes: [], edges: [], command: null });
  }, [botId, eventId]);

  if (isLoading) {
    return <div>Загрузка графа события...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-white">
      <ReactFlowProvider>
        <header className="p-2 border-b flex justify-between items-center">
          <h1 className="text-lg font-bold">Редактор графа: {command?.name}</h1>
          <Button onClick={() => saveGraph(botId, 'event')} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </header>
        <ResizablePanelGroup direction="horizontal" className="flex-grow">
          <ResizablePanel defaultSize={20}>
            <NodePanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60}>
            <VisualEditorCanvas />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={20}>
            <SettingsPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ReactFlowProvider>
    </div>
  );
}

export default EventGraphsPage;

