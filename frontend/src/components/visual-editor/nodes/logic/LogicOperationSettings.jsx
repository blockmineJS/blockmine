import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для logic:operation ноды
 */
const LogicOperationSettings = ({ nodeId, data, updateNodeData }) => {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="p-2 border-t border-slate-700">
      <Label>{t('nodeSettings.operator')}</Label>
      <Select
        value={data.operation || 'AND'}
        onValueChange={(value) => {
          const newPinCount = value === 'NOT' ? 1 : (data.pinCount || 2);
          updateNodeData(nodeId, { operation: value, pinCount: newPinCount });
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AND">{t('nodeSettings.logicAnd')}</SelectItem>
          <SelectItem value="OR">{t('nodeSettings.logicOr')}</SelectItem>
          <SelectItem value="NOT">{t('nodeSettings.logicNot')}</SelectItem>
        </SelectContent>
      </Select>
      {data.operation !== 'NOT' && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 2) + 1 })}
          >
            {t('nodeSettings.add')}
          </Button>
          {(data.pinCount || 0) > 2 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateNodeData(nodeId, { pinCount: Math.max(2, (data.pinCount || 2) - 1) })}
            >
              {t('nodeSettings.remove')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default LogicOperationSettings;
