import React from 'react';
import { useTranslation } from 'react-i18next';
import { AutosizeInput } from '@/components/ui/AutosizeInput';

/**
 * Компонент настроек для data:string_literal ноды
 */
const StringLiteralSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 w-full">
      <AutosizeInput
        className="visual-editor-node-input nodrag w-full rounded-md py-1 px-2 text-sm resize-none overflow-hidden"
        fullWidth
        value={data.value ?? ''}
        onChange={(e) => updateNodeData(nodeId, { value: e.target.value })}
        placeholder={t('nodeSettings.stringLiteralPlaceholder')}
      />
    </div>
  );
};

export default StringLiteralSettings;
