import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для data:type_check ноды
 */
const DataTypeCheckSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 border-t border-slate-700">
      <Label>{t('nodeSettings.checkType')}</Label>
      <Select
        value={data.checkType || 'string'}
        onValueChange={(value) => updateNodeData(nodeId, { checkType: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('nodeSettings.selectType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="string">{t('nodeSettings.typeString')}</SelectItem>
          <SelectItem value="number">{t('nodeSettings.typeNumber')}</SelectItem>
          <SelectItem value="numeric_string">{t('nodeSettings.typeNumericString')}</SelectItem>
          <SelectItem value="boolean">{t('nodeSettings.typeBoolean')}</SelectItem>
          <SelectItem value="array">{t('nodeSettings.typeArray')}</SelectItem>
          <SelectItem value="object">{t('nodeSettings.typeObject')}</SelectItem>
          <SelectItem value="null">{t('nodeSettings.typeNull')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DataTypeCheckSettings;
