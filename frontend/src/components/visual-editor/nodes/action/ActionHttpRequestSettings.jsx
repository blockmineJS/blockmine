import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Компонент настроек для action:http_request ноды
 */
const ActionHttpRequestSettings = ({ nodeId, data, updateNodeData, nodeEdges }) => {
  // Проверяем есть ли подключение к пину method
  const hasMethodConnection = nodeEdges?.some(edge =>
    edge.target === nodeId && edge.targetHandle === 'method'
  );

  return (
    <div className="p-2 border-t border-slate-700">
      {!hasMethodConnection && (
        <>
          <Label>HTTP Method:</Label>
          <Select
            value={data.method || 'GET'}
            onValueChange={(value) => updateNodeData(nodeId, { method: value })}
          >
            <SelectTrigger className="w-[120px] bg-slate-900 border-slate-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
};

export default ActionHttpRequestSettings;
