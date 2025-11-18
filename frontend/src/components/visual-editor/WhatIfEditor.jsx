import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, StopCircle, Edit2, X, Check } from 'lucide-react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

/**
 * WhatIfEditor - Редактор переменных во время паузы на брейкпоинте
 *
 * Позволяет:
 * - Просматривать текущие значения входных данных ноды
 * - Редактировать значения переменных
 * - Продолжить выполнение с изменёнными значениями
 */
const WhatIfEditor = () => {
  const debugSession = useVisualEditorStore(state => state.debugSession);
  const continueExecution = useVisualEditorStore(state => state.continueExecution);
  const stopExecution = useVisualEditorStore(state => state.stopExecution);
  const nodes = useVisualEditorStore(state => state.nodes);

  const [editedValues, setEditedValues] = useState({});
  const [editingKey, setEditingKey] = useState(null);

  // Сбрасываем редактирование при изменении сессии
  useEffect(() => {
    if (debugSession?.status === 'paused') {
      setEditedValues({});
      setEditingKey(null);
    }
  }, [debugSession?.sessionId]);

  if (!debugSession || debugSession.status !== 'paused') {
    return null;
  }

  const { nodeId, nodeType, context } = debugSession;

  // Находим ноду для получения её label
  const node = nodes.find(n => n.id === nodeId);
  const nodeLabel = node?.data?.label || nodeType;

  const handleEdit = (key) => {
    setEditingKey(key);
  };

  const handleSave = (key) => {
    setEditingKey(null);
  };

  const handleCancel = () => {
    setEditingKey(null);
    // Убираем изменения для этого ключа
    const newEdited = { ...editedValues };
    delete newEdited[editingKey];
    setEditedValues(newEdited);
  };

  const handleChange = (key, value) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleContinue = () => {
    // Отправляем только изменённые значения
    const overrides = Object.keys(editedValues).length > 0 ? editedValues : null;
    continueExecution(overrides);
  };

  const handleStop = () => {
    stopExecution();
  };

  const renderValue = (key, value) => {
    const displayValue = editedValues[key] !== undefined ? editedValues[key] : value;
    const isEdited = editedValues[key] !== undefined;
    const isEditing = editingKey === key;

    if (isEditing) {
      return (
        <div className="flex gap-2 items-center">
          <Input
            value={displayValue || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className="nodrag h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave(key);
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => handleSave(key)}
          >
            <Check className="w-4 h-4 text-green-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={handleCancel}
          >
            <X className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-2 items-center justify-between">
        <div className="flex-1 min-w-0">
          <code className={`text-sm ${isEdited ? 'text-yellow-300' : 'text-blue-300'}`}>
            {typeof displayValue === 'object'
              ? JSON.stringify(displayValue, null, 2)
              : String(displayValue || '(empty)')}
          </code>
          {isEdited && (
            <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-500">
              Изменено
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => handleEdit(key)}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <Card className="border-2 border-amber-500 bg-slate-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Выполнение приостановлено
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">
          Нода: <span className="text-white font-medium">{nodeLabel}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-300">
          <p className="mb-2">
            💡 Редактируйте значения прямо на нодах - кликните на зелёные бейджи с данными
          </p>
          <p className="text-xs text-slate-400">
            Все изменения синхронизируются в реальном времени между пользователями
          </p>
        </div>

        {/* Variables */}
        {Object.keys(context?.variables || {}).length > 0 && (
          <div>
            <Label className="text-xs text-slate-400 mb-2 block">📦 Переменные графа</Label>
            <div className="space-y-2">
              {Object.entries(context.variables).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs font-mono">{key}</Label>
                  {renderValue(`var.${key}`, value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          <Button
            size="sm"
            onClick={handleContinue}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Продолжить (F5)
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Стоп
          </Button>
        </div>

        {Object.keys(editedValues).length > 0 && (
          <div className="text-xs text-yellow-500 bg-yellow-900/20 p-2 rounded border border-yellow-700">
            ⚠️ Вы изменили {Object.keys(editedValues).length} {Object.keys(editedValues).length === 1 ? 'значение' : Object.keys(editedValues).length < 5 ? 'значения' : 'значений'}.
            Нажмите "Продолжить" для применения изменений.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatIfEditor;
