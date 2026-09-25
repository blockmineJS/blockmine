import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText } from 'lucide-react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

function formatEffect(effect) {
  if (!effect) return '';
  if (effect.kind === 'message') {
    const who = effect.username ? `${effect.username}: ` : '';
    return `[${effect.chatType || 'chat'}] ${who}${effect.message || ''}`;
  }
  if (effect.kind === 'log' || effect.kind === 'chat') return effect.message || '';
  if (effect.kind === 'gate') return effect.summary || effect.reason || '';
  if (effect.kind === 'db_write' || effect.kind === 'db_write_blocked') return effect.summary || effect.operation || '';
  if (effect.kind === 'move' || effect.kind === 'equip' || effect.kind === 'look' || effect.kind === 'control') {
    return effect.message || '';
  }
  return effect.message || effect.summary || effect.kind || '';
}

const TestEffectJournal = () => {
  const { t } = useTranslation('visual-editor');
  const testMode = useVisualEditorStore((state) => state.testMode);
  const testEffects = useVisualEditorStore((state) => state.testEffects);

  if (!testMode && (!testEffects || testEffects.length === 0)) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
        <ScrollText className="w-4 h-4 text-yellow-400" />
        {t('testMode.journalTitle')}
      </h3>
      <div className="bg-slate-900 rounded-lg p-3 max-h-56 overflow-auto space-y-2">
        {!testEffects || testEffects.length === 0 ? (
          <p className="text-xs text-slate-500">{t('testMode.journalEmpty')}</p>
        ) : (
          testEffects.map((effect) => (
            <div key={effect.id} className="border-b border-slate-800 last:border-b-0 pb-2 last:pb-0">
              <div className={`text-xs mb-1 ${effect.kind === 'db_write' || effect.kind === 'db_write_blocked' ? 'text-amber-400' : 'text-slate-400'}`}>
                {t(`testMode.kinds.${effect.kind}`, { defaultValue: effect.kind })}
              </div>
              <div className="text-sm font-mono text-slate-100 break-all whitespace-pre-wrap">
                {formatEffect(effect)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TestEffectJournal;
