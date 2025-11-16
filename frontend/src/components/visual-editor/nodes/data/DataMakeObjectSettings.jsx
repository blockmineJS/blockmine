import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для data:make_object ноды
 */
const DataMakeObjectSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
      <Button
        onClick={() => {
          const currentPinCount = data.pinCount || 0;
          updateNodeData(nodeId, { pinCount: currentPinCount + 1 });
        }}
        className="h-8 rounded-md px-3 text-xs"
      >
        Добавить поле
      </Button>
      {(data.pinCount || 0) > 0 && (
        <Button
          onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 0) - 1 })}
          variant="destructive"
          className="h-8 rounded-md px-3 text-xs"
        >
          Удалить поле
        </Button>
      )}
    </div>
  );
};

export default DataMakeObjectSettings;
