import React, { Suspense } from 'react';
import { ReactFlowProvider } from 'reactflow';
const VisualEditorCanvas = React.lazy(() => import('./VisualEditorCanvas'));

const VisualEditorPage = () => {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <VisualEditorCanvas />
      </Suspense>
    </ReactFlowProvider>
  );
};

export default VisualEditorPage;

