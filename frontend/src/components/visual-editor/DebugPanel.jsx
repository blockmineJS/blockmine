import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Bug, Users, Circle, Trash2, Eye, EyeOff } from 'lucide-react';
import WhatIfEditor from './WhatIfEditor';

const DebugPanel = () => {
  const { t } = useTranslation('visual-editor');
  const debugMode = useVisualEditorStore(state => state.debugMode);
  const setDebugMode = useVisualEditorStore(state => state.setDebugMode);
  const breakpoints = useVisualEditorStore(state => state.breakpoints);
  const debugSession = useVisualEditorStore(state => state.debugSession);
  const connectedDebugUsers = useVisualEditorStore(state => state.connectedDebugUsers);
  const nodes = useVisualEditorStore(state => state.nodes);
  const removeBreakpoint = useVisualEditorStore(state => state.removeBreakpoint);
  const toggleBreakpoint = useVisualEditorStore(state => state.toggleBreakpoint);
  const socket = useVisualEditorStore(state => state.socket);

  // Получить имя ноды по ID
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
        {/* Переключатель режима */}
        <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Label htmlFor="debug-mode" className="text-sm font-medium">
              {t('debugPanel.debugMode')}
            </Label>
            <Switch
              id="debug-mode"
              checked={debugMode === 'live'}
              onCheckedChange={(checked) => setDebugMode(checked ? 'live' : 'normal')}
            />
          </div>
          <Badge variant={debugMode === 'live' ? 'default' : 'secondary'}>
            {debugMode === 'live' ? t('debugPanel.live') : debugMode === 'trace' ? t('debugPanel.trace') : t('debugPanel.normal')}
          </Badge>
        </div>

        {/* Статус подключения */}
        {debugMode === 'live' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Circle
                  className={`w-3 h-3 ${socket ? 'fill-green-400 text-green-400' : 'fill-gray-400 text-gray-400'}`}
                />
                <span className="text-sm">
                  {socket ? t('debugPanel.connected') : t('debugPanel.disconnected')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{t('debugPanel.users', { count: connectedDebugUsers.length })}</span>
              </div>
            </div>

            {/* Список подключенных пользователей */}
            {connectedDebugUsers.length > 0 && (
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">{t('debugPanel.connectedUsers')}</div>
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
        )}

        {/* Статус выполнения */}
        {debugSession && (
          <div className="p-3 bg-amber-900/30 border border-amber-600 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-amber-400">
                {t('debugPanel.onPause')}
              </span>
              <Badge variant="outline" className="text-amber-400 border-amber-400">
                {getNodeName(debugSession.nodeId)}
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              {t('debugPanel.pausedDescription')}
            </p>
          </div>
        )}

        {/* WhatIf Editor - показываем когда выполнение на паузе */}
        {debugSession && debugSession.status === 'paused' && (
          <WhatIfEditor />
        )}

        {/* Список брейкпоинтов */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">
              {t('debugPanel.breakpoints')} ({breakpointsArray.length})
            </h3>
          </div>

          {breakpointsArray.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm border border-dashed border-slate-600 rounded-lg">
              {t('debugPanel.noBreakpoints')}
              <br />
              <span className="text-xs">
                {debugMode === 'live'
                  ? t('debugPanel.noBreakpointsLive')
                  : t('debugPanel.noBreakpointsNormal')
                }
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {breakpointsArray.map((bp) => (
                <div
                  key={bp.id}
                  className={`p-3 rounded-lg border ${
                    bp.enabled
                      ? 'bg-slate-700 border-slate-600'
                      : 'bg-slate-800 border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        {getNodeName(bp.nodeId)}
                      </span>
                      {bp.hitCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {t('debugPanel.hitCount', { count: bp.hitCount })}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleBreakpoint(bp.nodeId)}
                        title={bp.enabled ? t('debugPanel.disable') : t('debugPanel.enable')}
                      >
                        {bp.enabled ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
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
                    <div className="mt-2 p-2 bg-slate-900 rounded text-xs font-mono text-blue-300">
                      {bp.condition}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Инструкции для разных режимов */}
        {debugMode === 'normal' && (
          <div className="p-3 bg-slate-700/50 border border-slate-600/30 rounded-lg">
            <p className="text-xs text-slate-300">
              <Trans i18nKey="debugPanel.normalModeDesc" ns="visual-editor">
                <strong>Normal mode:</strong> Graph editing. Enable <strong>Live mode</strong> for real-time debugging with breakpoints.
              </Trans>
            </p>
          </div>
        )}
        {debugMode === 'trace' && (
          <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <p className="text-xs text-slate-300">
              <Trans i18nKey="debugPanel.traceModeDesc" ns="visual-editor">
                <strong>Trace mode:</strong> View execution traces after commands complete. Switch to <strong>Live mode</strong> for real-time debugging with breakpoints.
              </Trans>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
