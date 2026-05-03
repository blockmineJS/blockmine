import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import {
  Bug, Users, Circle, Trash2, Eye, EyeOff, FlaskConical, Play, Square,
  Activity, Wifi, ListChecks, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TestModeStartDialog from './TestModeStartDialog';

const DebugPanel = () => {
  const { t } = useTranslation('visual-editor');
  const debugMode = useVisualEditorStore(state => state.debugMode);
  const setDebugMode = useVisualEditorStore(state => state.setDebugMode);
  const breakpoints = useVisualEditorStore(state => state.breakpoints);
  const connectedDebugUsers = useVisualEditorStore(state => state.connectedDebugUsers);
  const nodes = useVisualEditorStore(state => state.nodes);
  const removeBreakpoint = useVisualEditorStore(state => state.removeBreakpoint);
  const toggleBreakpoint = useVisualEditorStore(state => state.toggleBreakpoint);
  const socket = useVisualEditorStore(state => state.socket);
  const testMode = useVisualEditorStore(state => state.testMode);
  const testModeRunning = useVisualEditorStore(state => state.testModeRunning);
  const disableTestMode = useVisualEditorStore(state => state.disableTestMode);
  const openRunNodeDialog = useVisualEditorStore(state => state.openRunNodeDialog);
  const [startDialogOpen, setStartDialogOpen] = useState(false);

  const selectedNodes = nodes.filter(n => n.selected);
  const singleSelected = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const getNodeName = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return nodeId;
    return node.type;
  };

  const breakpointsArray = Array.from(breakpoints.values());

  return (
    <Card className="bg-slate-800 border-slate-600 text-white h-full overflow-auto">
      <CardHeader className="pb-3 border-b border-slate-700">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bug className="w-5 h-5 text-blue-400" />
          {t('debugPanel.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Подключение */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            {t('debugPanel.connection')}
          </h3>
          <div className="bg-slate-900 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('debugPanel.status')}</span>
              <span className={cn(
                "text-sm font-medium px-2 py-0.5 rounded flex items-center gap-1",
                socket ? "bg-green-900/50 text-green-300" : "bg-slate-700 text-slate-400"
              )}>
                <Circle className={cn("w-2.5 h-2.5", socket ? "fill-green-400 text-green-400" : "fill-slate-500 text-slate-500")} />
                {socket ? t('debugPanel.connected') : t('debugPanel.disconnected')}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {t('debugPanel.usersLabel')}
              </span>
              <span className="text-sm font-medium">{connectedDebugUsers.length}</span>
            </div>
            {connectedDebugUsers.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="flex flex-wrap gap-1">
                  {connectedDebugUsers.map(user => (
                    <Badge key={user.socketId} variant="outline" className="text-xs">
                      {user.username}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Режим теста */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-yellow-400" />
            {t('testMode.title')}
            {testMode && (
              <Badge variant="outline" className="ml-auto text-yellow-400 border-yellow-500 text-xs">
                {testModeRunning ? t('testMode.running') : t('testMode.idle')}
              </Badge>
            )}
          </h3>
          <div className="bg-slate-900 rounded-lg p-3 space-y-2">
            <p className="text-xs text-slate-400">{t('testMode.description')}</p>
            {!testMode ? (
              <Button
                size="sm"
                className="w-full bg-yellow-600 hover:bg-yellow-700"
                onClick={() => setStartDialogOpen(true)}
              >
                <Play className="w-4 h-4 mr-2" />
                {t('testMode.startButton')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={() => disableTestMode()}
              >
                <Square className="w-4 h-4 mr-2" />
                {t('testMode.exitButton')}
              </Button>
            )}
            {singleSelected && (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-yellow-700 bg-slate-950 text-yellow-300 hover:bg-yellow-900/30 hover:text-yellow-200"
                onClick={() => openRunNodeDialog(singleSelected.id)}
              >
                <Play className="w-4 h-4 mr-2" />
                {t('testMode.runSelectedNode', { type: singleSelected.type })}
              </Button>
            )}
          </div>
        </div>

        {/* Брейкпоинты */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            {t('debugPanel.breakpoints')}
            <Badge variant="outline" className="ml-auto text-xs">{breakpointsArray.length}</Badge>
          </h3>
          {breakpointsArray.length === 0 ? (
            <div className="bg-slate-900 rounded-lg p-3 text-center text-slate-400 text-sm">
              <div>{t('debugPanel.noBreakpoints')}</div>
              <div className="text-xs mt-1 text-slate-500">
                {t('debugPanel.noBreakpointsLive')}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              {breakpointsArray.map((bp) => (
                <div
                  key={bp.id}
                  className={cn(
                    "border-b border-slate-800 last:border-b-0 pb-2 last:pb-0",
                    !bp.enabled && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Circle className={cn(
                        "w-2.5 h-2.5 shrink-0",
                        bp.enabled ? "fill-red-400 text-red-400" : "fill-slate-600 text-slate-600"
                      )} />
                      <span className="text-xs font-mono text-slate-300 truncate">
                        {getNodeName(bp.nodeId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {bp.hitCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {t('debugPanel.hitCount', { count: bp.hitCount })}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleBreakpoint(bp.nodeId)}
                        title={bp.enabled ? t('debugPanel.disable') : t('debugPanel.enable')}
                      >
                        {bp.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                        onClick={() => removeBreakpoint(bp.nodeId)}
                        title={t('debugPanel.delete')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {bp.condition && (
                    <div className="mt-1 p-2 bg-slate-950 rounded text-xs font-mono text-blue-300 break-all">
                      {bp.condition}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Подсказки для режимов */}
        {debugMode === 'live' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              {t('debugPanel.tipTitle')}
            </h3>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-xs text-slate-400">
                {t('debugPanel.liveModeTip')}
              </p>
            </div>
          </div>
        )}

        <TestModeStartDialog open={startDialogOpen} onOpenChange={setStartDialogOpen} />
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
