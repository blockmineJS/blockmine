import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import VisualEditorCanvas from './VisualEditorCanvas';

const VisualEditorPage = () => {
  return (
    <ReactFlowProvider>
      <VisualEditorCanvas />
    </ReactFlowProvider>
  );
};

export default VisualEditorPage;

