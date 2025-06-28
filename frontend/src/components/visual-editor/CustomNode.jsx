import React, { useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AutosizeInput } from '@/components/ui/AutosizeInput';
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
  const availableNodes = useVisualEditorStore(state => state.availableNodes);
  const updateNodeData = useVisualEditorStore(state => state.updateNodeData);
  const edges = useVisualEditorStore(state => state.edges);

  const nodeConfig = useMemo(() => 
    Object.values(availableNodes).flat().find(n => n.type === type), 
    [availableNodes, type]
  );

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
    <Card className="min-w-64 bg-slate-800 border-slate-600 text-white">
      <CardHeader className="bg-slate-700 p-2 rounded-t-lg">
        <CardTitle className="text-sm text-center">{nodeConfig.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 flex flex-col">
        <div className="flex justify-between w-full">
          <div className="inputs flex flex-col items-start">
            {nodeConfig.inputs.map(pin => {
              const hasConnection = edges.some(edge => edge.target === nodeId && edge.targetHandle === pin.id);
              if (pin.type === 'Exec') {
                return renderPin(pin, true);
              }
              return (
                <div key={pin.id} className="relative p-2 flex items-center w-full">
                  {renderPin(pin, true)}
                  {!hasConnection && (
                    <AutosizeInput
                      className="nodrag bg-slate-900 border-slate-500 rounded-md py-1 px-2 text-sm resize-none overflow-hidden"
                      value={data[pin.id] || ''}
                      onChange={(e) => updateNodeData(nodeId, { [pin.id]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
            {type === 'data:string_literal' && (
              <div className="p-2">
                <AutosizeInput
                  className="nodrag bg-slate-900 border-slate-500 rounded-md py-1 px-2 text-sm resize-none overflow-hidden w-full"
                  value={data.value || ''}
                  onChange={(e) => updateNodeData(nodeId, { value: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="outputs flex flex-col items-end">
            {nodeConfig.outputs.map(pin => renderPin(pin, false))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(CustomNode);

