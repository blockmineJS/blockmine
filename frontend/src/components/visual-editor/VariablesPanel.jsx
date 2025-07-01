import React from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { shallow } from 'zustand/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

const VariablesPanel = () => {
    const command = useVisualEditorStore(state => state.command);
    const addVariable = useVisualEditorStore(state => state.addVariable);
    const updateVariable = useVisualEditorStore(state => state.updateVariable);
    const removeVariable = useVisualEditorStore(state => state.removeVariable);
    
    const editorType = useVisualEditorStore(state => state.editorType);
    const variables = command?.variables || [];

    return (
        <div className="space-y-2 p-2 border-t">
            <h4 className="font-bold">Переменные</h4>
            <div className="space-y-2">
                {variables.map((variable) => (
                    <div key={variable.id} className="flex items-center gap-2 p-2 border rounded-md">
                        <Input
                            placeholder="Имя"
                            value={variable.name}
                            onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                            className="flex-grow"
                        />
                        <Select value={variable.type} onValueChange={(value) => updateVariable(variable.id, { type: value })}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Значение по умолч."
                            value={variable.value}
                            onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                            className="flex-grow"
                        />
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