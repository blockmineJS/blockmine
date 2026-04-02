import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для logic:compare ноды
 */
const LogicCompareSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 border-t border-slate-700">
      <Label>{t('nodeSettings.operator')}</Label>
      <Select
        value={data.operation || '=='}
        onValueChange={(value) => updateNodeData(nodeId, { operation: value })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="==">{t('nodeSettings.compareEquals')}</SelectItem>
          <SelectItem value="!=">{t('nodeSettings.compareNotEquals')}</SelectItem>
          <SelectItem value=">">{t('nodeSettings.compareGreater')}</SelectItem>
          <SelectItem value="<">{t('nodeSettings.compareLess')}</SelectItem>
          <SelectItem value=">=">{t('nodeSettings.compareGreaterOrEqual')}</SelectItem>
          <SelectItem value="<=">{t('nodeSettings.compareLessOrEqual')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LogicCompareSettings;
