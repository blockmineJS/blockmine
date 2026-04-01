import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Настройки для ноды flow:for_each
 */
function FlowForEachSettings({ nodeId, data, updateNodeData }) {
  const { t } = useTranslation('visual-editor');

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>{t('nodeHelp.flowForEach.intro')}</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>{t('nodeHelp.flowForEach.item1')}</li>
          <li>{t('nodeHelp.flowForEach.item2')}</li>
          <li>{t('nodeHelp.flowForEach.item3')}</li>
          <li>{t('nodeHelp.flowForEach.item4')}</li>
          <li>{t('nodeHelp.flowForEach.item5')}</li>
        </ul>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        {t('nodeHelp.flowForEach.note')}
      </div>
    </div>
  );
}

export default FlowForEachSettings;
