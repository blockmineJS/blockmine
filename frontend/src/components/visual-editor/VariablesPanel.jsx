import React from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ValueInput = ({ variable }) => {
    const { updateVariable } = useVisualEditorStore();
  
    switch (variable.type) {
      case 'boolean':
        return (
          <Select value={variable.value || 'false'} onValueChange={(value) => updateVariable(variable.id, { value })}>
            <SelectTrigger className="flex-grow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'array':
        let displayValue = '';
        try {
            const parsed = JSON.parse(variable.value || '[]');
            if(Array.isArray(parsed)) {
                displayValue = parsed.join(', ');
            }
        } catch (e) { /* ignore parsing errors while user is typing */ }

        return (
          <Input
            placeholder="Элементы через запятую"
            value={displayValue}
            onChange={(e) => {
              const newArray = e.target.value.split(',').map(s => s.trim());
              updateVariable(variable.id, { value: JSON.stringify(newArray) });
            }}
            className="flex-grow"
          />
        );
      case 'number':
          return (
              <Input
                type="number"
                placeholder="Значение"
                value={variable.value}
                onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                className="flex-grow"
              />
          )
      case 'string':
      default:
        return (
          <Input
            placeholder="Значение"
            value={variable.value}
            onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
            className="flex-grow"
          />
        );
    }
  };

const VariablesPanel = () => {
  const { command, addVariable, updateVariable, removeVariable } = useVisualEditorStore();

  if (!command || !command.variables) {
    return null;
  }
  
  const variables = command.variables || [];

  return (
    <div className="space-y-2">
      <h4 className="font-bold">Переменные графа</h4>
      <div className="space-y-2">
        {variables.map((variable) => (
          <div key={variable.id} className="flex items-center gap-2 p-2 border rounded-md">
            <Input
              placeholder="Имя"
              value={variable.name}
              onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
              className="w-1/3"
            />
             <Select value={variable.type || 'string'} onValueChange={(value) => updateVariable(variable.id, { type: value }) }>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                </SelectContent>
            </Select>
            <ValueInput variable={variable} />
            <Button variant="ghost" size="icon" onClick={() => removeVariable(variable.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addVariable}>Добавить переменную</Button>
    </div>
  );
};

export default VariablesPanel; 