import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Play, Square, ArrowRight } from 'lucide-react';

const DebugControls = () => {
  const { t } = useTranslation('visual-editor');
  const debugSession = useVisualEditorStore(state => state.debugSession);
  const continueExecution = useVisualEditorStore(state => state.continueExecution);
  const stepExecution = useVisualEditorStore(state => state.stepExecution);
  const stopExecution = useVisualEditorStore(state => state.stopExecution);

  if (!debugSession || debugSession.status !== 'paused') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-slate-900 border-2 border-amber-500 rounded-lg p-3 shadow-2xl">
        <div className="flex items-center gap-2 px-3 border-r border-slate-700">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-amber-400">{t('debugControls.paused')}</span>
        </div>

        <Button
          variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => continueExecution()}
        >
          <Play className="w-4 h-4 mr-2" />
          {t('debugControls.continue')}
        </Button>

        <Button
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => stepExecution()}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          {t('debugControls.stepForward')}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => stopExecution()}
        >
          <Square className="w-4 h-4 mr-2" />
          {t('debugControls.stop')}
        </Button>
      </div>
    </div>
  );
};

export default DebugControls;
