import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Настройки для ноды flow:delay
 */
function FlowDelaySettings({ nodeId, data, updateNodeData }) {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="delay">{t('nodeHelp.flowDelay.label')}</Label>
        <Input
          id="delay"
          type="number"
          min="0"
          value={data.delay ?? 1000}
          onChange={(e) => updateNodeData(nodeId, { delay: parseInt(e.target.value) || 0 })}
          placeholder="1000"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('nodeSettings.usedWhenPinDisconnected', { pin: 'Delay' })}
        </p>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>{t('nodeHelp.flowDelay.intro')}</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>{t('nodeHelp.flowDelay.item1')}</li>
          <li>{t('nodeHelp.flowDelay.item2')}</li>
          <li>{t('nodeHelp.flowDelay.item3')}</li>
        </ul>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        {t('nodeHelp.flowDelay.note')}
      </div>
    </div>
  );
}

export default FlowDelaySettings;
