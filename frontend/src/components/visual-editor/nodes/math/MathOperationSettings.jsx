import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для math:operation ноды
 */
const MathOperationSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Операция:</Label>
      <Select
        value={data.operation || '+'}
        onValueChange={(value) => updateNodeData(nodeId, { operation: value })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="+">Сложение (+)</SelectItem>
          <SelectItem value="-">Вычитание (-)</SelectItem>
          <SelectItem value="*">Умножение (*)</SelectItem>
          <SelectItem value="/">Деление (/)</SelectItem>
          <SelectItem value=">">Больше (&gt;)</SelectItem>
          <SelectItem value="<">Меньше (&lt;)</SelectItem>
          <SelectItem value="==">Равно (==)</SelectItem>
          <SelectItem value=">=">Больше или равно (&gt;=)</SelectItem>
          <SelectItem value="<=">Меньше или равно (&lt;=)</SelectItem>
          <SelectItem value="!=">Не равно (!=)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default MathOperationSettings;
