import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Компонент настроек для data:number_literal ноды
 */
const DataNumberLiteralSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700">
      <Label>Число:</Label>
      <Input
        type="number"
        value={data.value || 0}
        onChange={(e) => updateNodeData(nodeId, { value: parseFloat(e.target.value) || 0 })}
        className="mt-1"
      />
    </div>
  );
};

export default DataNumberLiteralSettings;
