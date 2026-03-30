import React from 'react';
import { useTranslation } from 'react-i18next';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

const VariablesPanel = () => {
    const { t } = useTranslation('visual-editor');
    const command = useVisualEditorStore(state => state.command);
    const addVariable = useVisualEditorStore(state => state.addVariable);
    const updateVariable = useVisualEditorStore(state => state.updateVariable);
    const removeVariable = useVisualEditorStore(state => state.removeVariable);
    
    const variables = command?.variables || [];

    return (
        <div className="space-y-3 rounded-lg border bg-background/60 p-3">
            <div className="space-y-2">
                <h4 className="font-bold">{t('variables.title')}</h4>
                <Button variant="outline" size="sm" className="h-9 w-full justify-center" onClick={addVariable}>
                    {t('variables.addVariable')}
                </Button>
            </div>
            <div className="space-y-2">
                {variables.map((variable) => (
                    <div key={variable.id} className="space-y-3 rounded-md border bg-background/70 p-3">
                        <Input
                            placeholder={t('variables.namePlaceholder')}
                            value={variable.name}
                            onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                            className="h-10"
                        />
                        <div className="space-y-2">
                        <Select value={variable.type} onValueChange={(value) => updateVariable(variable.id, { type: value })}>
                            <SelectTrigger className="h-10 w-full">
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
                            placeholder={t('variables.valuePlaceholder')}
                            value={variable.value}
                            onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                            className="h-10"
                        />
                        </div>
                        <div className="flex justify-end border-t pt-2">
                         <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeVariable(variable.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VariablesPanel; 
