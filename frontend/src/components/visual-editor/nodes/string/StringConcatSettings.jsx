import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Компонент настроек для string:concat ноды
 */
const StringConcatSettings = ({ nodeId, data, updateNodeData }) => {
  return (
    <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
      <Button
        onClick={() => {
          const currentPinCount = data.pinCount || 2;
          updateNodeData(nodeId, { pinCount: currentPinCount + 1 });
        }}
        className="h-8 rounded-md px-3 text-xs"
      >
        Добавить
      </Button>
      {((data.pinCount ?? 2) > 2) && (
        <Button
          onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount ?? 2) - 1 })}
          variant="destructive"
          className="h-8 rounded-md px-3 text-xs"
        >
          Удалить
        </Button>
      )}
    </div>
  );
};

export default StringConcatSettings;
