import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для flow:sequence ноды
 */
const FlowSequenceSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
      <Button
        onClick={() => {
          const currentCount = data.pinCount || 2;
          updateNodeData(nodeId, { pinCount: currentCount + 1 });
        }}
        className="h-8 rounded-md px-3 text-xs"
      >
        {t('nodeSettings.add')}
      </Button>
      <Button
        onClick={() => {
          const currentCount = data.pinCount || 2;
          if (currentCount > 1) {
            updateNodeData(nodeId, { pinCount: currentCount - 1 });
          }
        }}
        variant="destructive"
        className="h-8 rounded-md px-3 text-xs"
      >
        {t('nodeSettings.remove')}
      </Button>
    </div>
  );
};

export default FlowSequenceSettings;
