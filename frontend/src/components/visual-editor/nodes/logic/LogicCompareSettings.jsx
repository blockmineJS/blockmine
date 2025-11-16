import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для logic:compare ноды
 */
const LogicCompareSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Операция:</Label>
      <Select
        value={data.operation || '=='}
        onValueChange={(value) => updateNodeData(nodeId, { operation: value })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="==">Равно (==)</SelectItem>
          <SelectItem value="!=">Не равно (!=)</SelectItem>
          <SelectItem value=">">Больше (&gt;)</SelectItem>
          <SelectItem value="<">Меньше (&lt;)</SelectItem>
          <SelectItem value=">=">Больше или равно (&gt;=)</SelectItem>
          <SelectItem value="<=">Меньше или равно (&lt;=)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LogicCompareSettings;
