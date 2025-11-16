import React, { useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { pinColors } from '../../editorTheme';
import { AutosizeInput } from '@/components/ui/AutosizeInput';

/**
 * BaseNode - базовый UI компонент для всех нод
 *
 * Отвечает за:
 * - Отображение заголовка и описания
 * - Рендеринг входных и выходных пинов
 * - Рендеринг инлайн-полей для пинов
 * - Рендеринг компонента настроек
 *
 * ОПТИМИЗАЦИЯ:
 * - TooltipProvider создается один раз для всей ноды
 * - Pin компонент мемоизирован через React.memo
 * - Разделение пинов выполняется один раз через useMemo
 */

// Компонент для рендеринга одного пина с опциональным инлайн-полем
const Pin = React.memo(({ pin, isInput, nodeId, data, updateNodeData, context = {}, nodeEdges = [] }) => {
  const position = isInput ? Position.Left : Position.Right;
  const style = {
    background: pinColors[pin.type] || '#333',
  };

  // Проверяем есть ли подключение к этому пину
  const hasConnection = nodeEdges.some(edge =>
    isInput
      ? (edge.target === nodeId && edge.targetHandle === pin.id)
      : (edge.source === nodeId && edge.sourceHandle === pin.id)
  );

  // Если пин имеет инлайн-поле, рендерим его в той же строке
  // НО только если нет подключения к пину
  const hasInlineField = pin.inlineField && isInput && !hasConnection;

  const pinContent = (
    <div className="relative p-2 flex items-center">
      {/* Для output пинов иконка слева от текста */}
      {!isInput && pin.description && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-slate-400 cursor-help mr-2" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white border-slate-700">
            <p className="text-xs">{pin.description}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <Handle
        type={isInput ? 'target' : 'source'}
        position={position}
        id={pin.id}
        style={{ ...style, width: '16px', height: '16px' }}
        className="w-4 h-4"
      />
      <span className={isInput ? 'pl-4' : 'pr-4'}>{pin.name}</span>
      {/* Для input пинов иконка справа от текста */}
      {isInput && pin.description && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-slate-400 cursor-help ml-2" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white border-slate-700">
            <p className="text-xs">{pin.description}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  // Если нет инлайн-поля, просто возвращаем пин
  if (!hasInlineField) {
    return pinContent;
  }

  // Инлайн-поле рядом с пином
  // Поддержка select для Boolean типа или если указан inlineFieldType: 'select'
  const isSelectField = pin.inlineFieldType === 'select' || (pin.type === 'Boolean' && pin.inlineFieldOptions);

  if (isSelectField) {
    let options = pin.inlineFieldOptions;

    // Если опции - это функция, вызываем её с context
    if (typeof options === 'function') {
      options = options(context);
    }

    // Дефолтные опции для Boolean
    if (!options) {
      options = [
        { value: 'false', label: 'Нет' },
        { value: 'true', label: 'Да' }
      ];
    }

    return (
      <div className="relative p-2 flex items-center w-full">
        {pinContent}
        <Select
          value={String(data[pin.id] ?? pin.defaultValue ?? (options[0]?.value || 'false'))}
          onValueChange={(value) => {
            const parsedValue = pin.type === 'Boolean' ? value === 'true' : value;
            updateNodeData(nodeId, { [pin.id]: parsedValue });
          }}
        >
          <SelectTrigger className="nodrag w-[120px] h-8 bg-slate-900 border-slate-500 text-sm">
            <SelectValue placeholder="Выбрать..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Обычное текстовое инлайн-поле
  return (
    <div className="relative p-2 flex items-center w-full">
      {pinContent}
      <AutosizeInput
        className="nodrag bg-slate-900 border-slate-500 rounded-md py-1 px-2 text-sm resize-none overflow-hidden"
        value={data[pin.id] || ''}
        onChange={(e) => updateNodeData(nodeId, { [pin.id]: e.target.value })}
        placeholder={pin.placeholder || ''}
      />
    </div>
  );
});

Pin.displayName = 'Pin';

const BaseNode = ({
  nodeId,
  type,
  label,
  description,
  inputs = [],
  outputs = [],
  SettingsComponent = null,
  data = {},
  updateNodeData,
  theme = {},
  context = {},
  nodeEdges = [],
}) => {
  // Разделяем пины на Exec и Data ОДИН РАЗ
  const { execInputs, dataInputs, execOutputs, dataOutputs } = useMemo(() => {
    return {
      execInputs: inputs.filter(p => p.type === 'Exec'),
      dataInputs: inputs.filter(p => p.type !== 'Exec'),
      execOutputs: outputs.filter(p => p.type === 'Exec'),
      dataOutputs: outputs.filter(p => p.type !== 'Exec'),
    };
  }, [inputs, outputs]);

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="min-w-64 bg-slate-800 border-slate-600 text-white">
        <CardHeader className="bg-slate-700 p-2 rounded-t-lg">
          <CardTitle className="text-sm text-center">{label}</CardTitle>
          {description && (
            <p className="text-xs text-slate-300 text-center mt-1 leading-tight">
              {description}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-2 flex flex-col">
          {/* Pins Section */}
          <div className="flex justify-between w-full">
            {/* Input Pins */}
            <div className="inputs flex flex-col items-start">
              {execInputs.map(pin => (
                <Pin
                  key={pin.id}
                  pin={pin}
                  isInput={true}
                  nodeId={nodeId}
                  data={data}
                  updateNodeData={updateNodeData}
                  context={context}
                  nodeEdges={nodeEdges}
                />
              ))}
              {dataInputs.map(pin => (
                <Pin
                  key={pin.id}
                  pin={pin}
                  isInput={true}
                  nodeId={nodeId}
                  data={data}
                  updateNodeData={updateNodeData}
                  context={context}
                  nodeEdges={nodeEdges}
                />
              ))}
            </div>

            {/* Output Pins */}
            <div className="outputs flex flex-col items-end">
              {execOutputs.map(pin => (
                <Pin
                  key={pin.id}
                  pin={pin}
                  isInput={false}
                  nodeId={nodeId}
                  data={data}
                  updateNodeData={updateNodeData}
                  context={context}
                  nodeEdges={nodeEdges}
                />
              ))}
              {dataOutputs.map(pin => (
                <Pin
                  key={pin.id}
                  pin={pin}
                  isInput={false}
                  nodeId={nodeId}
                  data={data}
                  updateNodeData={updateNodeData}
                  context={context}
                  nodeEdges={nodeEdges}
                />
              ))}
            </div>
          </div>

          {/* Settings Component */}
          {SettingsComponent && (
            <SettingsComponent
              nodeId={nodeId}
              data={data}
              updateNodeData={updateNodeData}
            />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default React.memo(BaseNode);
