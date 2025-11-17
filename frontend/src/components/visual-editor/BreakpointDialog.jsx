import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

const BreakpointDialog = ({ isOpen, onClose, nodeId }) => {
  const [condition, setCondition] = useState('');
  const addBreakpoint = useVisualEditorStore(state => state.addBreakpoint);
  const breakpoints = useVisualEditorStore(state => state.breakpoints);
  const nodes = useVisualEditorStore(state => state.nodes);
  const edges = useVisualEditorStore(state => state.edges);

  const existingBreakpoint = breakpoints.get(nodeId);

  // Получаем информацию о ноде и её входах
  const nodeInfo = useMemo(() => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    // Находим входящие connections
    const incomingEdges = edges.filter(e => e.target === nodeId);
    const inputTypes = new Set();

    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode?.type === 'event:command') {
        inputTypes.add('user');
        inputTypes.add('args');
      }
    });

    return {
      type: node.type,
      hasUserInput: inputTypes.has('user'),
      hasArgsInput: inputTypes.has('args')
    };
  }, [nodeId, nodes, edges]);

  const handleSave = () => {
    addBreakpoint(nodeId, condition.trim() || null);
    onClose();
    setCondition('');
  };

  const handleCancel = () => {
    onClose();
    setCondition('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {existingBreakpoint ? 'Редактировать брейкпоинт' : 'Добавить брейкпоинт'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Брейкпоинт приостановит выполнение на этой ноде. Вы сможете просмотреть и изменить значения переменных перед продолжением.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="condition" className="text-sm font-medium">
              Условие (необязательно)
            </Label>
            <Textarea
              id="condition"
              placeholder="user.username === 'admin'"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white font-mono text-sm min-h-[100px]"
            />
            <p className="text-xs text-slate-400">
              JavaScript выражение. Оставьте пустым для безусловной остановки.
              <br />
              Доступные переменные: <code className="text-blue-400">user</code>,{' '}
              <code className="text-blue-400">args</code>,{' '}
              <code className="text-blue-400">variables</code>
            </p>
          </div>

          <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              💡 Как работают условия:
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 ml-4 list-disc">
              <li>Выполнение остановится только если условие вернёт <code className="text-green-400">true</code></li>
              <li>Используйте <code className="text-blue-400">user</code> для проверки пользователя (username, id)</li>
              <li>Используйте <code className="text-blue-400">args</code> для проверки аргументов команды</li>
              <li>Используйте <code className="text-blue-400">variables</code> для проверки переменных графа</li>
            </ul>
          </div>

          <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              📋 Примеры условий:
            </p>
            <div className="space-y-2">
              {nodeInfo?.hasUserInput && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Остановиться только для админа:</p>
                  <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                    user.username === &apos;admin&apos;
                  </code>
                </div>
              )}
              {nodeInfo?.hasArgsInput && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Остановиться если число больше 10:</p>
                  <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                    args.count &gt; 10
                  </code>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 mb-1">Остановиться в режиме отладки:</p>
                <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                  variables.debug_mode === true
                </code>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Комбинация условий:</p>
                <code className="text-xs text-blue-400 bg-slate-900/50 px-2 py-1 rounded block">
                  user.username === &apos;admin&apos; && variables.test_mode
                </code>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            {existingBreakpoint ? 'Обновить' : 'Добавить'} брейкпоинт
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BreakpointDialog;
