import React from 'react';
import { AutosizeInput } from '@/components/ui/AutosizeInput';

/**
 * Компонент настроек для data:string_literal ноды
 */
const StringLiteralSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 w-full">
      <AutosizeInput
        className="nodrag bg-slate-900 border-slate-500 rounded-md py-1 px-2 text-sm resize-none overflow-hidden w-full"
        value={data.value ?? ''}
        onChange={(e) => updateNodeData(nodeId, { value: e.target.value })}
        placeholder="Привет, {username}!"
      />
    </div>
  );
};

export default StringLiteralSettings;
