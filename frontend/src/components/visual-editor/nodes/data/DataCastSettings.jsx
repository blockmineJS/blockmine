import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для data:cast ноды
 */
const DataCastSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Целевой тип:</Label>
      <Select
        value={data.targetType || 'String'}
        onValueChange={(value) => updateNodeData(nodeId, { targetType: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Выберите тип..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="String">String (Текст)</SelectItem>
          <SelectItem value="Number">Number (Число)</SelectItem>
          <SelectItem value="Boolean">Boolean (Да/Нет)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DataCastSettings;
