import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Компонент настроек для data:number_literal ноды
 */
const DataNumberLiteralSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 border-t border-slate-700">
      <Label>{t('nodeSettings.number')}</Label>
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
