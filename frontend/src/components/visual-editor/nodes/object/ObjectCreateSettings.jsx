import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для object:create ноды
 */
const ObjectCreateSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <Label>Режим:</Label>
        <Select
          value={data.advanced ? 'advanced' : 'simple'}
          onValueChange={(value) => updateNodeData(nodeId, { advanced: value === 'advanced' })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Простой</SelectItem>
            <SelectItem value="advanced">Продвинутый</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.advanced ? (
        <div>
          <Label>JSON объект:</Label>
          <textarea
            className="nodrag w-full h-32 bg-slate-900 border-slate-500 rounded-md p-2 text-sm font-mono resize-none"
            value={data.jsonValue || '{}'}
            onChange={(e) => updateNodeData(nodeId, { jsonValue: e.target.value })}
            placeholder='{"key": "value", "nested": {"inner": 123}}'
          />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 0) + 1 })}
            className="h-8 rounded-md px-3 text-xs"
          >
            Добавить
          </Button>
          {(data.pinCount || 0) > 0 && (
            <Button
              onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 0) - 1 })}
              variant="destructive"
              className="h-8 rounded-md px-3 text-xs"
            >
              Удалить
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ObjectCreateSettings;
