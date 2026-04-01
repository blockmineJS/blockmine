import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для data:array_literal ноды
 */
const ArrayLiteralSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
      <Button
        onClick={() => {
          const currentPinCount = data.pinCount || 0;
          updateNodeData(nodeId, { pinCount: currentPinCount + 1 });
        }}
        className="h-8 rounded-md px-3 text-xs"
      >
        {t('nodeSettings.add')}
      </Button>
      {(data.pinCount > 0) && (
        <Button
          onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 0) - 1 })}
          variant="destructive"
          className="h-8 rounded-md px-3 text-xs"
        >
          {t('nodeSettings.remove')}
        </Button>
      )}
    </div>
  );
};

export default ArrayLiteralSettings;
