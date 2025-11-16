import React from 'react';

/**
 * Настройки для ноды flow:break
 */
function FlowBreakSettings({ data, updateNodeData }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p>Нода <strong>Break</strong> прерывает выполнение цикла.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Используется внутри циклов <strong>For Each</strong> и <strong>While</strong></li>
          <li>При выполнении немедленно прерывает цикл</li>
          <li>Управление передается на выход <strong>Completed</strong> цикла</li>
        </ul>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
        <strong>Примечание:</strong> Нода не имеет выходных пинов, так как после
        прерывания выполнение продолжается с выхода Completed родительского цикла.
      </div>
    </div>
  );
}

export default FlowBreakSettings;
