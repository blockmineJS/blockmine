import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для time:compare ноды
 */
const TimeCompareSettings = ({ nodeId, data, updateNodeData, nodeEdges }) => {
  const hasOperationConnection = nodeEdges?.some(edge =>
    edge.target === nodeId && edge.targetHandle === 'operation'
  );

  if (hasOperationConnection) {
    return null;
  }

  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Операция:</Label>
      <Select value={data.operation || 'before'} onValueChange={(value) => updateNodeData(nodeId, { operation: value })}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите операцию..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="before">Раньше (&lt;)</SelectItem>
          <SelectItem value="after">Позже (&gt;)</SelectItem>
          <SelectItem value="equal">Равны (=)</SelectItem>
          <SelectItem value="before_or_equal">Раньше или равно (≤)</SelectItem>
          <SelectItem value="after_or_equal">Позже или равно (≥)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimeCompareSettings;
