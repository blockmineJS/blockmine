import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для logic:operation ноды
 */
const LogicOperationSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Операция:</Label>
      <Select
        value={data.operation || 'AND'}
        onValueChange={(value) => {
          const newPinCount = value === 'NOT' ? 1 : (data.pinCount || 2);
          updateNodeData(nodeId, { operation: value, pinCount: newPinCount });
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AND">И (AND)</SelectItem>
          <SelectItem value="OR">ИЛИ (OR)</SelectItem>
          <SelectItem value="NOT">НЕ (NOT)</SelectItem>
        </SelectContent>
      </Select>
      {data.operation !== 'NOT' && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 2) + 1 })}
          >
            Добавить
          </Button>
          {(data.pinCount || 0) > 2 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateNodeData(nodeId, { pinCount: Math.max(2, (data.pinCount || 2) - 1) })}
            >
              Удалить
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default LogicOperationSettings;
