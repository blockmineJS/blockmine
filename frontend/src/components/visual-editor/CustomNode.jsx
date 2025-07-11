import React, { useMemo, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AutosizeInput } from '@/components/ui/AutosizeInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
const pinColors = {
  Exec: '#ffffff',
  Boolean: '#dc2626',
  String: '#db2777',
  Number: '#2563eb',
  User: '#f59e0b',
  Array: '#3b82f6',
  Wildcard: '#6b7280',
  Object: '#9333ea',
};

function CustomNode({ data, type, id: nodeId }) {
  const availableNodes = useVisualEditorStore(state => state.availableNodes);
  const updateNodeData = useVisualEditorStore(state => state.updateNodeData);
  const edges = useVisualEditorStore(state => state.edges);
  const variables = useVisualEditorStore(state => state.variables);
  const commandArguments = useVisualEditorStore(state => state.commandArguments);
  const editorType = useVisualEditorStore(state => state.editorType);

  const nodeConfig = useMemo(() => 
    Object.values(availableNodes).flat().find(n => n.type === type), 
    [availableNodes, type]
  );

  const inputs = useMemo(() => {
    let baseInputs = nodeConfig?.pins?.inputs ? [...nodeConfig.pins.inputs] : [];
    
    if (type === 'data:array_literal') {
      for (let i = 0; i < (data.pinCount || 0); i++) {
        baseInputs.push({
          id: `item_${i}`,
          name: `[${i}]`,
          type: 'Wildcard',
        });
      }
    } else if (type === 'data:make_object') {
      for (let i = 0; i < (data.pinCount || 0); i++) {
        baseInputs.push({
          id: `key_${i}`,
          name: `Ключ ${i}`,
          type: 'String',
        });
        baseInputs.push({
          id: `value_${i}`,
          name: `Значение ${i}`,
          type: 'Wildcard',
        });
      }
    } else if (type === 'string:concat') {
        baseInputs = []; 
        const pinCount = data.pinCount || 2;
        for (let i = 0; i < pinCount; i++) {
            baseInputs.push({
                id: `pin_${i}`,
                name: `Строка ${i}`,
                type: 'String',
            });
        }
    } else if (type === 'logic:operation' && data.operation !== 'NOT') {
        baseInputs = [];
        const pinCount = data.pinCount || 2;
        for (let i = 0; i < pinCount; i++) {
            baseInputs.push({
                id: `pin_${i}`,
                name: String.fromCharCode(65 + i),
                type: 'Boolean',
            });
        }
    } else if (type === 'logic:operation' && data.operation === 'NOT') {
        baseInputs = baseInputs.filter(p => p.id === 'a');
    } else if (type === 'flow:branch' && data.advanced) {
      const conditionIndex = baseInputs.findIndex(p => p.id === 'condition');
      if (conditionIndex !== -1) {
        baseInputs.splice(conditionIndex, 1);
      }

      for (let i = 0; i < (data.pinCount || 0); i++) {
        baseInputs.push({
          id: `pin_${i}`,
          name: String.fromCharCode(65 + i),
          type: 'Boolean',
        });
      }
    } else if (type === 'flow:branch' && !data.advanced) {
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
        {nodeConfig.description && (
          <p className="text-xs text-slate-300 text-center mt-1 leading-tight">
            {nodeConfig.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-2 flex flex-col">
        {type === 'data:cast' && (
            <div className="p-2 border-t border-slate-700">
                <Label>Целевой тип:</Label>
                <Select value={data.targetType || 'String'} onValueChange={(value) => updateNodeData(nodeId, { targetType: value })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Выберите тип..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="String">String (Текст)</SelectItem>
                        <SelectItem value="Number">Number (Число)</SelectItem>
                        <SelectItem value="Boolean">Boolean (Да/Нет)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        )}
        {type === 'data:get_argument' && (
            <div className="p-2">
                <Label>Имя аргумента:</Label>
                <Select value={data.argumentName || ''} onValueChange={(value) => updateNodeData(nodeId, { argumentName: value })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Выберите аргумент..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(commandArguments || []).map(arg => (
                            <SelectItem key={arg.id} value={arg.name}>{arg.name} ({arg.type})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
        {type === 'data:get_variable' && (
            <div className="p-2">
                <Label>Имя переменной:</Label>
                <Select value={data.variableName || ''} onValueChange={(value) => updateNodeData(nodeId, { variableName: value })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Выберите переменную..." />
                    </SelectTrigger>
                    <SelectContent>
                        {variables.filter(v => v.name).map(v => (
                            <SelectItem key={v.id} value={v.name}>{v.name} ({v.type})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {false && type === 'math:random_number' && (
          <div className="p-2 space-y-2">
            <div>
              <Label>Min</Label>
              <Input
                type="number"
                className="nodrag bg-slate-900 border-slate-500 rounded-md py-1 px-2 text-sm"
                value={data.min || '0'}
                onChange={(e) => updateNodeData(nodeId, { min: e.target.value })}
              />
            </div>
            <div>
              <Label>Max</Label>
              <Input
                type="number"
                className="nodrag bg-slate-900 border-slate-500 rounded-md py-1 px-2 text-sm"
                value={data.max || '1'}
                onChange={(e) => updateNodeData(nodeId, { max: e.target.value })}
              />
            </div>
          </div>
        )}
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
                  {!hasConnection && pin.type === 'Boolean' && (
                    <Select value={String(data[pin.id] === undefined ? false : data[pin.id])} onValueChange={(value) => updateNodeData(nodeId, { [pin.id]: value === 'true' })}>
                        <SelectTrigger className="w-[100px] bg-slate-900 border-slate-500">
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
              <div className="p-2 w-full">
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
        
        {(type === 'flow:sequence' || type === 'string:concat' || type === 'logic:operation' || type === 'data:array_literal' || type === 'data:make_object' || (type === 'flow:branch' && data.advanced)) && (
          <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
            <Button
              onClick={() => {
                const currentPinCount = data.pinCount || (type === 'logic:operation' || type === 'string:concat' ? 2 : 0);
                updateNodeData(nodeId, { pinCount: currentPinCount + 1 });
              }}
              className="h-8 rounded-md px-3 text-xs"
            >
              Добавить
            </Button>
            {(data.pinCount > (type === 'logic:operation' || type === 'string:concat' ? 2 : 0)) && (
              <Button
                onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 0) - 1 })}
                variant="destructive"
                className="h-8 rounded-md px-3 text-xs"
              >
                Удалить
              </Button>
            )}
          </div>
        )}
      </CardContent>
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
      {nodeConfig.dynamicPins && type !== 'logic:operation' && (
        <div className="p-2 border-t border-slate-700 flex items-center justify-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 0) + 1 })}>
            Добавить
          </Button>
          {(data.pinCount || 0) > (type === 'string:concat' ? 2 : 0) && (
              <Button size="sm" variant="destructive" onClick={() => updateNodeData(nodeId, { pinCount: Math.max((type === 'string:concat' ? 2 : 0), (data.pinCount || 0) - 1) })}>
                  Удалить
              </Button>
          )}
        </div>
      )}
      {type === 'math:operation' && (
        <div className="p-2 border-t border-slate-700">
          <Label>Операция:</Label>
          <Select value={data.operation || '+'} onValueChange={(value) => updateNodeData(nodeId, { operation: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+">Сложение (+)</SelectItem>
              <SelectItem value="-">Вычитание (-)</SelectItem>
              <SelectItem value="*">Умножение (*)</SelectItem>
              <SelectItem value="/">Деление (/)</SelectItem>
              <SelectItem value=">">Больше (&gt;)</SelectItem>
              <SelectItem value="<">Меньше (&lt;)</SelectItem>
              <SelectItem value="==">Равно (==)</SelectItem>
              <SelectItem value=">=">Больше или равно (&gt;=)</SelectItem>
              <SelectItem value="<=">Меньше или равно (&lt;=)</SelectItem>
              <SelectItem value="!=">Не равно (!=)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {type === 'logic:operation' && (
        <div className="p-2 border-t border-slate-700">
          <Label>Операция:</Label>
          <Select 
            value={data.operation || 'AND'} 
            onValueChange={(value) => {
              const newPinCount = value === 'NOT' ? 1 : (data.pinCount || 2);
              updateNodeData(nodeId, { operation: value, pinCount: newPinCount });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">И (AND)</SelectItem>
              <SelectItem value="OR">ИЛИ (OR)</SelectItem>
              <SelectItem value="NOT">НЕ (NOT)</SelectItem>
            </SelectContent>
          </Select>
          {data.operation !== 'NOT' && (
            <div className="flex items-center justify-center gap-2 mt-2">
                <Button size="sm" variant="ghost" onClick={() => updateNodeData(nodeId, { pinCount: (data.pinCount || 2) + 1 })}>
                    Добавить
                </Button>
                {(data.pinCount || 0) > 2 && (
                    <Button size="sm" variant="destructive" onClick={() => updateNodeData(nodeId, { pinCount: Math.max(2, (data.pinCount || 2) - 1) })}>
                        Удалить
                    </Button>
                )}
            </div>
          )}
        </div>
      )}
      {type === 'logic:compare' && (
        <div className="p-2 border-t border-slate-700">
          <Label>Операция:</Label>
          <Select value={data.operation || '=='} onValueChange={(value) => updateNodeData(nodeId, { operation: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="==">Равно (==)</SelectItem>
              <SelectItem value="!=">Не равно (!=)</SelectItem>
              <SelectItem value=">">Больше (&gt;)</SelectItem>
              <SelectItem value="<">Меньше (&lt;)</SelectItem>
              <SelectItem value=">=">Больше или равно (&gt;=)</SelectItem>
              <SelectItem value="<=">Меньше или равно (&lt;=)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </Card>
  );
}

export default React.memo(CustomNode);

