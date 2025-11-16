import React from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для data:get_argument ноды
 */
const DataGetArgumentSettings = ({ nodeId, data, updateNodeData }) => {
  const commandArguments = useVisualEditorStore(state => state.commandArguments);

  return (
    <div className="p-2">
      <Label>Имя аргумента:</Label>
      <Select
        value={data.argumentName || ''}
        onValueChange={(value) => updateNodeData(nodeId, { argumentName: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Выберите аргумент..." />
        </SelectTrigger>
        <SelectContent>
          {(commandArguments || []).map(arg => (
            <SelectItem key={arg.id} value={arg.name}>
              {arg.name} ({arg.type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DataGetArgumentSettings;
