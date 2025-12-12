import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactFlowProvider } from 'reactflow';
const VisualEditorCanvas = React.lazy(() => import('./VisualEditorCanvas'));

const VisualEditorPage = () => {
  const { t } = useTranslation('visual-editor');
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div>{t('loading')}</div>}>
        <VisualEditorCanvas />
      </Suspense>
    </ReactFlowProvider>
  );
};

export default VisualEditorPage;

