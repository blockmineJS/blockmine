import React from 'react';
import { useTranslation } from 'react-i18next';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для data:get_variable ноды
 */
const DataGetVariableSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');
  const variables = useVisualEditorStore(state => state.variables);

  return (
    <div className="p-2">
      <Label>{t('nodeSettings.variableName')}</Label>
      <Select
        value={data.variableName || ''}
        onValueChange={(value) => updateNodeData(nodeId, { variableName: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('nodeSettings.selectVariable')} />
        </SelectTrigger>
        <SelectContent>
          {variables.filter(v => v.name).map(v => (
            <SelectItem key={v.id} value={v.name}>
              {v.name} ({v.type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DataGetVariableSettings;
