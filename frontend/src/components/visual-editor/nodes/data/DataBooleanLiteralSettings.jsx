import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для data:boolean_literal ноды
 */
const DataBooleanLiteralSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Значение:</Label>
      <Select
        value={data.value ? 'true' : 'false'}
        onValueChange={(value) => updateNodeData(nodeId, { value: value === 'true' })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True (Истина)</SelectItem>
          <SelectItem value="false">False (Ложь)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DataBooleanLiteralSettings;
