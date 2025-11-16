import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Настройки для ноды math:random_number
 */
function MathRandomNumberSettings({ nodeId, data, updateNodeData }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="min">Минимум (по умолчанию)</Label>
        <Input
          id="min"
          type="text"
          value={data.min ?? '0'}
          onChange={(e) => updateNodeData(nodeId, { min: e.target.value })}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Используется если пин Min не подключен
        </p>
      </div>

      <div>
        <Label htmlFor="max">Максимум (по умолчанию)</Label>
        <Input
          id="max"
          type="text"
          value={data.max ?? '1'}
          onChange={(e) => updateNodeData(nodeId, { max: e.target.value })}
          placeholder="1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Используется если пин Max не подключен
        </p>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        <strong>Примечание:</strong> Если min или max содержат точку или запятую,
        будет сгенерировано float число, иначе - целое число.
      </div>
    </div>
  );
}

export default MathRandomNumberSettings;
