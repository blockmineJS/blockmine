import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Настройки для ноды flow:break
 */
function FlowBreakSettings({ nodeId, data, updateNodeData }) {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>{t('nodeHelp.flowBreak.intro')}</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>{t('nodeHelp.flowBreak.item1')}</li>
          <li>{t('nodeHelp.flowBreak.item2')}</li>
          <li>{t('nodeHelp.flowBreak.item3')}</li>
        </ul>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        {t('nodeHelp.flowBreak.note')}
      </div>
    </div>
  );
}

export default FlowBreakSettings;
