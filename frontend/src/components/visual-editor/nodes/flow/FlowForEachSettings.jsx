import React from 'react';

/**
 * Настройки для ноды flow:for_each
 */
function FlowForEachSettings({ data, updateNodeData }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>Цикл <strong>For Each</strong> проходит по каждому элементу массива.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Подключите массив к входу <strong>Array</strong></li>
          <li>Используйте выход <strong>Element</strong> для получения текущего элемента</li>
          <li>Используйте выход <strong>Index</strong> для получения индекса</li>
          <li>Тело цикла выполняется для каждого элемента</li>
          <li>После завершения срабатывает выход <strong>Completed</strong></li>
        </ul>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        <strong>Примечание:</strong> Цикл можно прервать с помощью ноды <strong>Break</strong>
      </div>
    </div>
  );
}

export default FlowForEachSettings;
