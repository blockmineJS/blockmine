import React, { useEffect, useState, useTransition } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { ReactFlowProvider } from 'reactflow';
import VisualEditorCanvas from '../../components/visual-editor/VisualEditorCanvas';
import SettingsPanel from '../../components/visual-editor/SettingsPanel';
import NodePanel from '../../components/visual-editor/NodePanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { apiHelper } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Edit, MoreVertical, PlusCircle, Trash2, Share2, GitBranchPlus, ToyBrick, GitCommitHorizontal, Link2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CreateEventGraphDialog from '../../components/visual-editor/CreateEventGraphDialog';
import ShareEventGraphDialog from '../../components/ShareEventGraphDialog';
import ImportEventGraphDialog from '../../components/ImportEventGraphDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function EventGraphsPage() {
  const { botId, eventId } = useParams();

  if (eventId) {
    return <EventGraphEditor botId={botId} eventId={eventId} />;
  } else {
    return <EventGraphList botId={botId} />;
  }
}

function EmptyState({ onActionClick, t }) {
    return (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
            <ToyBrick className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">{t('empty.title')}</h3>
            <p className="mt-1 text-sm text-gray-500">
                {t('empty.description')}
            </p>
            <div className="mt-6">
                <Button onClick={onActionClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('empty.createFirst')}
                </Button>
            </div>
        </div>
    );
}

function EventGraphList({ botId }) {
  const [eventGraphs, setEventGraphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [sharingGraphId, setSharingGraphId] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { t } = useTranslation('event-graphs');

  const fetchEventGraphs = async () => {
    setLoading(true);
    try {
      const graphs = await apiHelper(`/api/bots/${botId}/event-graphs`);
      setEventGraphs(graphs);
    } catch (error) {
      toast({ variant: 'destructive', title: t('messages.error'), description: t('messages.loadError') });
    }
    setLoading(false);
  };

  const handleToggle = async (graph) => {
    startTransition(async () => {
      try {
        const updatedGraph = await apiHelper(`/api/bots/${botId}/event-graphs/${graph.id}`, {
          method: 'PUT',
          body: { isEnabled: !graph.isEnabled },
        });
        setEventGraphs(prev => prev.map(g => (g.id === graph.id ? { ...g, isEnabled: updatedGraph.isEnabled } : g)));
        toast({ title: t('messages.success'), description: t('messages.toggleSuccess', { name: graph.name, status: updatedGraph.isEnabled ? t('messages.enabled') : t('messages.disabled') }) });
      } catch (error) {
        toast({ variant: 'destructive', title: t('messages.error'), description: t('messages.toggleError') });
      }
    });
  };
  
  const handleDuplicate = async (graphId) => {
    try {
        await apiHelper(`/api/bots/${botId}/event-graphs/${graphId}/duplicate`, { method: 'POST' });
        toast({ title: t('messages.success'), description: t('messages.duplicateSuccess') });
        fetchEventGraphs();
    } catch (error) {
        toast({ variant: 'destructive', title: t('messages.error'), description: t('messages.duplicateError') });
    }
  };

  const deleteEventGraph = async (graphId) => {
    try {
      await apiHelper(`/api/bots/${botId}/event-graphs/${graphId}`, { method: 'DELETE' });
      fetchEventGraphs();
    } catch (error) {
      console.error("Не удалось удалить граф событий:", error);
    }
  };

  useEffect(() => {
    fetchEventGraphs();
  }, [botId]);

  if (loading) {
    return <div>{t('loading.graphs')}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            {t('actions.import')}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('actions.create')}
          </Button>
        </div>
      </div>
      
      <CreateEventGraphDialog botId={botId} open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onCreated={fetchEventGraphs} />
      <ImportEventGraphDialog botId={botId} open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} onImportSuccess={() => { setIsImportDialogOpen(false); fetchEventGraphs(); }}/>
      <ShareEventGraphDialog botId={botId} graphId={sharingGraphId} onCancel={() => setSharingGraphId(null)} />

      {eventGraphs.length === 0 ? (
        <EmptyState onActionClick={() => setIsCreateDialogOpen(true)} t={t} />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t('table.status')}</TableHead>
                <TableHead>{t('table.name')}</TableHead>
                <TableHead>{t('table.plugin')}</TableHead>
                <TableHead>{t('table.triggers')}</TableHead>
                <TableHead>{t('table.stats')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventGraphs.map(graph => (
                <TableRow key={graph.id}>
                  <TableCell>
                    <Switch checked={graph.isEnabled} onCheckedChange={() => handleToggle(graph)} disabled={isPending} />
                  </TableCell>
                  <TableCell className="font-medium">{graph.name}</TableCell>
                  <TableCell>
                    {graph.pluginOwner ? (
                      <Badge variant="outline" className="text-xs">
                        {graph.pluginOwner.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(graph.triggers || []).map(trigger => (
                        <Badge key={trigger.id} variant="secondary">{trigger.eventType}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                       <div className="flex items-center gap-1"><GitCommitHorizontal className="h-4 w-4" /> {graph.nodeCount}</div>
                       <div className="flex items-center gap-1"><Link2 className="h-4 w-4" /> {graph.edgeCount}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={`/bots/${botId}/events/visual/${graph.id}`}>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>{t('actions.edit')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(graph.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          <span>{t('actions.duplicate')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSharingGraphId(graph.id)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          <span>{t('actions.share')}</span>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>{t('actions.delete')}</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('deleteDialog.description', { name: graph.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteEventGraph(graph.id)} className="bg-destructive hover:bg-destructive/90">{t('actions.delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function EventGraphEditor({ botId, eventId }) {
  const { init, isLoading, command, saveGraph, isSaving } = useVisualEditorStore();
  const [error, setError] = useState(null);
  const { t } = useTranslation('event-graphs');

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
    return <div>{t('loading.editor')}</div>;
  }

  if (error) {
    return <div>{t('messages.error')}: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-white">
      <ReactFlowProvider>
        <header className="p-2 border-b flex justify-between items-center">
          <h1 className="text-lg font-bold">{t('editor.title')}: {command?.name}</h1>
          <Button onClick={() => saveGraph(botId, 'event')} disabled={isSaving}>
            {isSaving ? t('actions.saving') : t('actions.save')}
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

