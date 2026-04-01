import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AutosizeInput } from '@/components/ui/AutosizeInput';

/**
 * Компонент настроек для flow:switch ноды
 */
const FlowSwitchSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 border-t border-slate-700">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('nodeSettings.cases')}</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const currentCount = data.caseCount || 0;
                updateNodeData(nodeId, { caseCount: currentCount + 1 });
              }}
              className="h-6 px-2 text-xs"
            >
              {t('nodeSettings.add')}
            </Button>
            {(data.caseCount || 0) > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  const currentCount = data.caseCount || 0;
                  if (currentCount > 0) {
                    updateNodeData(nodeId, {
                      caseCount: currentCount - 1,
                      [`case_${currentCount - 1}`]: undefined
                    });
                  }
                }}
                className="h-6 px-2 text-xs"
              >
                {t('nodeSettings.remove')}
              </Button>
            )}
          </div>
        </div>

        {/* Список case'ов */}
        {Array.from({ length: data.caseCount || 0 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Label className="text-xs w-12">Case {i}:</Label>
            <AutosizeInput
              className="visual-editor-node-input nodrag flex-1 rounded-md py-1 px-2 text-sm resize-none overflow-hidden"
              fullWidth
              value={data[`case_${i}`] ?? ''}
              onChange={(e) => updateNodeData(nodeId, { [`case_${i}`]: e.target.value })}
              placeholder={t('nodeSettings.comparePlaceholder')}
            />
          </div>
        ))}

        <div className="text-xs text-slate-400 mt-2">
          {t('nodeSettings.autoCompareHint')}
        </div>
      </div>
    </div>
  );
};

export default FlowSwitchSettings;
