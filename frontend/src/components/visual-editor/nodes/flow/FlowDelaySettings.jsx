import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Настройки для ноды flow:delay
 */
function FlowDelaySettings({ data, updateNodeData }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="delay">Задержка в миллисекундах (по умолчанию)</Label>
        <Input
          id="delay"
          type="number"
          min="0"
          value={data.delay ?? 1000}
          onChange={(e) => updateNodeData({ delay: parseInt(e.target.value) || 0 })}
          placeholder="1000"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Используется если пин Delay не подключен
        </p>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>Нода <strong>Delay</strong> приостанавливает выполнение графа.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>1000 мс = 1 секунда</li>
          <li>Можно указать задержку через пин или в настройках</li>
          <li>Если значение отрицательное или не число, задержка будет 0 мс</li>
        </ul>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        <strong>Примечание:</strong> Задержка работает асинхронно и не блокирует
        другие процессы приложения.
      </div>
    </div>
  );
}

export default FlowDelaySettings;
