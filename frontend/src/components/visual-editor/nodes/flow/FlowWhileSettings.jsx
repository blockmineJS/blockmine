import React from 'react';

/**
 * Настройки для ноды flow:while
 */
function FlowWhileSettings({ data, updateNodeData }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>Цикл <strong>While</strong> выполняется пока условие истинно.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Подключите boolean значение к входу <strong>Condition</strong></li>
          <li>Используйте выход <strong>Iteration</strong> для получения номера итерации</li>
          <li>Тело цикла выполняется при каждой итерации</li>
          <li>После завершения срабатывает выход <strong>Completed</strong></li>
        </ul>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        <strong>⚠️ Важно:</strong> Максимальное количество итераций - 1000.
        Убедитесь что условие может стать false, иначе цикл будет прерван.
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        <strong>Примечание:</strong> Цикл можно прервать досрочно с помощью ноды <strong>Break</strong>
      </div>
    </div>
  );
}

export default FlowWhileSettings;
