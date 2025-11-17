import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Bug, Users, Circle, Trash2, Eye, EyeOff } from 'lucide-react';
import WhatIfEditor from './WhatIfEditor';

const DebugPanel = () => {
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
          Панель отладки
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Переключатель режима */}
        <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Label htmlFor="debug-mode" className="text-sm font-medium">
              Режим отладки
            </Label>
            <Switch
              id="debug-mode"
              checked={debugMode === 'live'}
              onCheckedChange={(checked) => setDebugMode(checked ? 'live' : 'trace')}
            />
          </div>
          <Badge variant={debugMode === 'live' ? 'default' : 'secondary'}>
            {debugMode === 'live' ? 'Live' : 'Трассировка'}
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
                  {socket ? 'Подключено' : 'Отключено'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{connectedDebugUsers.length} {connectedDebugUsers.length === 1 ? 'пользователь' : connectedDebugUsers.length < 5 ? 'пользователя' : 'пользователей'}</span>
              </div>
            </div>

            {/* Список подключенных пользователей */}
            {connectedDebugUsers.length > 0 && (
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">Подключенные пользователи:</div>
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
                ⏸️ На паузе
              </span>
              <Badge variant="outline" className="text-amber-400 border-amber-400">
                {getNodeName(debugSession.nodeId)}
              </Badge>
            </div>
            <p className="text-xs text-slate-300">
              Выполнение приостановлено на брейкпоинте. Используйте элементы управления для продолжения.
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
              Брейкпоинты ({breakpointsArray.length})
            </h3>
          </div>

          {breakpointsArray.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm border border-dashed border-slate-600 rounded-lg">
              Нет брейкпоинтов
              <br />
              <span className="text-xs">
                {debugMode === 'live'
                  ? 'Нажмите на левый край ноды, чтобы добавить брейкпоинт'
                  : 'Переключитесь в Live режим для добавления брейкпоинтов'
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
                          Срабатываний: {bp.hitCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleBreakpoint(bp.nodeId)}
                        title={bp.enabled ? 'Отключить' : 'Включить'}
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
                        title="Удалить"
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

        {/* Инструкция для Trace режима */}
        {debugMode === 'trace' && (
          <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <p className="text-xs text-slate-300">
              <strong>Режим трассировки:</strong> Просмотр трассировок выполнения после завершения команд.
              Переключитесь в <strong>Live режим</strong> для отладки в реальном времени с брейкпоинтами.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
