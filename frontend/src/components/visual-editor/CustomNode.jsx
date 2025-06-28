import React, { useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AutosizeInput } from '@/components/ui/AutosizeInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const inputs = useMemo(() => {
    const baseInputs = nodeConfig?.pins?.inputs ? [...nodeConfig.pins.inputs] : [];
    if (type === 'flow:branch' && data.advanced) {
      // В расширенном режиме удаляем "condition", если он есть
      const conditionIndex = baseInputs.findIndex(p => p.id === 'condition');
      if (conditionIndex !== -1) {
        baseInputs.splice(conditionIndex, 1);
      }

      // Добавляем динамические пины
      for (let i = 0; i < (data.pinCount || 0); i++) {
        baseInputs.push({
          id: `pin_${i}`,
          name: String.fromCharCode(65 + i),
          type: 'Boolean',
        });
      }
    } else if (type === 'flow:branch' && !data.advanced) {
        // В простом режиме, убедимся что condition на месте, а динамических пинов нет
        if (!baseInputs.find(p => p.id === 'condition')) {
            baseInputs.push({ id: 'condition', name: 'Condition', type: 'Boolean', required: true });
        }
        return baseInputs.filter(p => p.id === 'condition' || p.type === 'Exec');
    }
    return baseInputs;
  }, [nodeConfig, data, type]);

  const outputs = useMemo(() => {
    if (type === 'flow:sequence') {
      const pinCount = data.pinCount || 2;
      const dynamicOutputs = [];
      for (let i = 0; i < pinCount; i++) {
        dynamicOutputs.push({
          id: `exec_${i}`,
          name: `${i}`,
          type: 'Exec',
        });
      }
      return dynamicOutputs;
    }
    return nodeConfig?.pins?.outputs || [];
  }, [nodeConfig, data, type]);

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
          style={{...style, width: '16px', height: '16px'}}
          className="w-4 h-4"
        />
        <span className={isInput ? 'pl-4' : 'pr-4'}>{pin.name}</span>
      </div>
    );
  };

  return (
    <Card className="min-w-64 bg-slate-800 border-slate-600 text-white">
      <CardHeader className="bg-slate-700 p-2 rounded-t-lg">
        <CardTitle className="text-sm text-center">{nodeConfig.name || nodeConfig.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 flex flex-col">
        <div className="flex justify-between w-full">
          <div className="inputs flex flex-col items-start">
            {inputs.map(pin => {
              const hasConnection = edges.some(edge => edge.target === nodeId && edge.targetHandle === pin.id);
              if (pin.type === 'Exec') {
                return renderPin(pin, true);
              }
              return (
                <div key={pin.id} className="relative p-2 flex items-center w-full">
                  {renderPin(pin, true)}
                  {!hasConnection && pin.type !== 'Boolean' && pin.id !== 'persist' && (
                    <AutosizeInput
                      className="nodrag bg-slate-900 border-slate-500 rounded-md py-1 px-2 text-sm resize-none overflow-hidden"
                      value={data[pin.id] || ''}
                      onChange={(e) => updateNodeData(nodeId, { [pin.id]: e.target.value })}
                    />
                  )}
                  {!hasConnection && pin.id === 'persist' && (
                    <Select value={data[pin.id] || 'false'} onValueChange={(value) => updateNodeData(nodeId, { [pin.id]: value })}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
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
            {outputs.map(pin => renderPin(pin, false))}
          </div>
        </div>
      </CardContent>
      {type === 'data:cast' && (
        <div className="p-2 border-t border-slate-700">
          <Label>Целевой тип:</Label>
          <Select value={data.targetType || 'String'} onValueChange={(value) => updateNodeData(nodeId, { targetType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="String">String (Текст)</SelectItem>
              <SelectItem value="Number">Number (Число)</SelectItem>
              <SelectItem value="Boolean">Boolean (Да/Нет)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {type === 'flow:branch' && (
        <div className="p-2 border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label>Режим:</Label>
            <Select value={data.advanced ? 'advanced' : 'simple'} onValueChange={(value) => updateNodeData(nodeId, { advanced: value === 'advanced' })}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Простой</SelectItem>
                <SelectItem value="advanced">Расширенный</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.advanced && (
            <div className="flex items-center gap-2">
              <Label>Оператор:</Label>
              <Select value={data.operator || 'AND'} onValueChange={(value) => updateNodeData(nodeId, { operator: value, pinCount: value === 'NOT' ? 1 : data.pinCount || 2 })}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                  <SelectItem value="NOT">NOT</SelectItem>
                </SelectContent>
              </Select>
              {data.operator !== 'NOT' && (
                <Button size="sm" variant="ghost" onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 2) + 1 })}>
                  Добавить пин
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {type === 'flow:sequence' && (
        <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => {
                const currentCount = data.pinCount || 2;
                updateNodeData(nodeId, { pinCount: currentCount + 1 });
            }}>
                Добавить
            </Button>
            <Button size="sm" variant="destructive" onClick={() => {
                const currentCount = data.pinCount || 2;
                if (currentCount > 1) {
                    updateNodeData(nodeId, { pinCount: currentCount - 1 });
                }
            }}>
                Удалить
            </Button>
        </div>
      )}
      {nodeConfig.dynamicPins && (
        <div className="p-2 border-t border-slate-700">
          <Button size="sm" variant="ghost" onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 2) + 1 })}>
            Добавить пин
          </Button>
        </div>
      )}
    </Card>
  );
}

export default React.memo(CustomNode);

