import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для flow:branch ноды
 */
const FlowBranchSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');
  return (
    <div className="p-2 border-t border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Label>{t('nodeSettings.mode')}</Label>
        <Select
          value={data.advanced ? 'advanced' : 'simple'}
          onValueChange={(value) => updateNodeData(nodeId, { advanced: value === 'advanced' })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">{t('nodeSettings.simple')}</SelectItem>
            <SelectItem value="advanced">{t('nodeSettings.advanced')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.advanced && (
        <div className="flex items-center gap-2">
          <Label>{t('nodeSettings.operator')}</Label>
          <Select
            value={data.operator || 'AND'}
            onValueChange={(value) =>
              updateNodeData(nodeId, {
                operator: value,
                pinCount: value === 'NOT' ? 1 : data.pinCount || 2,
              })
            }
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
              <SelectItem value="NOT">NOT</SelectItem>
            </SelectContent>
          </Select>
          {data.operator !== 'NOT' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 2) + 1 })}
            >
              {t('nodeSettings.addPin')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FlowBranchSettings;
