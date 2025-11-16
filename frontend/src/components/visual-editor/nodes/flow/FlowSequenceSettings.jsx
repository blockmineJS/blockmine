import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для flow:sequence ноды
 */
const FlowSequenceSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
      <Button
        onClick={() => {
          const currentCount = data.pinCount || 2;
          updateNodeData(nodeId, { pinCount: currentCount + 1 });
        }}
        className="h-8 rounded-md px-3 text-xs"
      >
        Добавить
      </Button>
      <Button
        onClick={() => {
          const currentCount = data.pinCount || 2;
          if (currentCount > 1) {
            updateNodeData(nodeId, { pinCount: currentCount - 1 });
          }
        }}
        variant="destructive"
        className="h-8 rounded-md px-3 text-xs"
      >
        Удалить
      </Button>
    </div>
  );
};

export default FlowSequenceSettings;
