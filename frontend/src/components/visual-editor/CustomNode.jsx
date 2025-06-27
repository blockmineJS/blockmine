import React from 'react';
import { Handle, Position } from 'reactflow';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
const pinColors = {
  Exec: '#ffffff',
  Boolean: '#dc2626', // red-600
  String: '#db2777', // pink-600
  Number: '#2563eb', // blue-600
  User: '#f59e0b', // amber-500
  Array: '#3b82f6', // blue-500
  Wildcard: '#6b7280', // gray-500
  Object: '#9333ea', // purple-600
};

function CustomNode({ data, type, id: nodeId }) {
  // Получаем полную конфигурацию этой ноды из нашего store
  const { availableNodes, updateNodeData, edges } = useVisualEditorStore();
  const nodeConfig = Object.values(availableNodes).flat().find(n => n.type === type);

  if (!nodeConfig) {
    return <div>Неизвестный тип ноды: {type}</div>;
  }

  const renderPin = (pin, isInput) => {
    const position = isInput ? Position.Left : Position.Right;
    const style = {
      background: pinColors[pin.type] || '#333',
    };

    return (
      <div key={pin.id} className="relative p-2 flex items-center">
        <Handle 
          type={isInput ? 'target' : 'source'} 
          position={position} 
          id={pin.id} 
          style={style}
        />
        <span className={isInput ? 'pl-4' : 'pr-4'}>{pin.name}</span>
      </div>
    );
  };

  return (
    <Card className="w-64 bg-slate-800 border-slate-600 text-white">
      <CardHeader className="bg-slate-700 p-2 rounded-t-lg">
        <CardTitle className="text-sm text-center">{nodeConfig.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex justify-between">
        <div className="inputs w-1/2 flex flex-col items-start">
          {nodeConfig.inputs.map(pin => {
            const hasConnection = edges.some(edge => edge.target === nodeId && edge.targetHandle === pin.id);
            if (pin.type === 'Exec') {
              return renderPin(pin, true);
            }
            return (
              <div key={pin.id} className="relative p-2 flex items-center w-full">
                {renderPin(pin, true)}
                {!hasConnection && (
                  <Input 
                    className="nodrag bg-slate-900 border-slate-500 h-8 ml-2"
                    type="text"
                    value={data[pin.id] || ''}
                    onChange={(e) => updateNodeData(nodeId, { [pin.id]: e.target.value })}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="outputs w-1/2 flex flex-col items-end">
          {nodeConfig.outputs.map(pin => renderPin(pin, false))}
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(CustomNode);

