import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, CheckCircle2, Circle } from 'lucide-react';
import { pinColors } from '../../editorTheme';
import { AutosizeInput } from '@/components/ui/AutosizeInput';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { cn } from '@/lib/utils';
import BreakpointDialog from '../../BreakpointDialog';
import ValueEditor from '../../ValueEditor';

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

/**
 * Форматирует значение для отображения в бейдже
 * - Обрезает длинные строки
 * - Показывает JSON для объектов
 */
const formatValueForDisplay = (value, maxLength = 30) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  let str;
  if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
};

// Компонент для рендеринга одного пина с опциональным инлайн-полем
const Pin = React.memo(({
  pin,
  isInput,
  nodeId,
  data,
  updateNodeData,
  context = {},
  nodeEdges = [],
  traceValue = undefined,
  onEditValue = null,
  debugMode = null,
  connectingPin = null
}) => {
  const { t } = useTranslation('nodes');
  const position = isInput ? Position.Left : Position.Right;

  let isCompatible = false;
  let isIncompatible = false;
  const isActiveConnectingHandle =
    !!connectingPin &&
    connectingPin.nodeId === nodeId &&
    connectingPin.handleId === pin.id &&
    ((connectingPin.handleType === 'source' && !isInput) ||
      (connectingPin.handleType === 'target' && isInput));

  if (connectingPin) {
    if (connectingPin.nodeId !== nodeId) {
      const isValidDirection = (connectingPin.handleType === 'source' && isInput) ||
                              (connectingPin.handleType === 'target' && !isInput);

      if (isValidDirection) {
        const sourceType = connectingPin.handleType === 'source' ? connectingPin.pinType : pin.type;
        const targetType = connectingPin.handleType === 'source' ? pin.type : connectingPin.pinType;

        const isExecConnection = sourceType === 'Exec' || targetType === 'Exec';

        if (isExecConnection) {
          isCompatible = sourceType === 'Exec' && targetType === 'Exec';
        } else {
          isCompatible = sourceType === targetType || sourceType === 'Wildcard' || targetType === 'Wildcard';
        }

        isIncompatible = !isCompatible;
      }
    }
  }

  const baseColor = pinColors[pin.type] || '#333';
  const isExecPin = pin.type === 'Exec';
  const shouldUseConnectHighlight = isCompatible || isActiveConnectingHandle;
  const style = {
    background: shouldUseConnectHighlight ? '#22c55e' : baseColor,
    width: '16px',
    height: '16px',
    top: '50%',
    left: isInput ? (isExecPin ? '0px' : '-4px') : 'auto',
    right: isInput ? 'auto' : '-4px',
    marginTop: '-8px',
    transform: 'none',
    boxShadow: shouldUseConnectHighlight
      ? `0 0 0 2px rgba(34, 197, 94, 0.82), 0 0 14px 3px rgba(34, 197, 94, 0.72), 0 0 24px 6px rgba(34, 197, 94, 0.42)`
      : 'none',
    opacity: isIncompatible ? 0.3 : 1,
    transition: 'opacity 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    border: 'none',
  };

  const handleClassName = cn(
    shouldUseConnectHighlight && "animate-[pulse_1.5s_ease-in-out_infinite]"
  );

  // Проверяем есть ли подключение к этому пину
  const hasConnection = nodeEdges.some(edge =>
    isInput
      ? (edge.target === nodeId && edge.targetHandle === pin.id)
      : (edge.source === nodeId && edge.sourceHandle === pin.id)
  );

  // Если пин имеет инлайн-поле, рендерим его в той же строке
  // НО только если нет подключения к пину И нет trace значения
  const hasInlineField = pin.inlineField && isInput && !hasConnection && traceValue === undefined;

  const pinContent = (
    <div
      className={cn(
        "relative flex w-full items-center py-2",
        isInput ? "pl-1 pr-2" : "justify-end pl-2 pr-1 text-right"
      )}
    >
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
        style={style}
        className={handleClassName}
      />
      <span className={cn(
        "text-sm leading-none",
        isInput
          ? (isExecPin ? "pl-6" : "pl-5")
          : "pr-5 text-right"
      )}>
        {pin.name}
      </span>
      {/* Отображаем значение из трассировки, если есть */}
      {traceValue !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "px-2 py-0.5 bg-green-900/50 text-green-300 text-xs rounded border border-green-700",
                isInput ? "ml-2" : "mr-2",
                debugMode === 'live' && onEditValue && "cursor-pointer hover:bg-green-800/50 hover:border-green-600 transition-colors"
              )}
              onClick={(e) => {
                if (debugMode === 'live' && onEditValue) {
                  e.stopPropagation();
                  onEditValue({
                    nodeId,
                    pinId: pin.id,
                    pinName: pin.name,
                    value: traceValue,
                    isInput
                  });
                }
              }}
            >
              {formatValueForDisplay(traceValue)}
            </span>
          </TooltipTrigger>
          <TooltipContent side={isInput ? "right" : "left"} className="max-w-md bg-slate-900 text-white border-slate-700">
            <div className="text-xs">
              <div className="font-semibold mb-1 text-green-400">{pin.name}</div>
              <pre className="whitespace-pre-wrap break-all">
                {typeof traceValue === 'object'
                  ? JSON.stringify(traceValue, null, 2)
                  : String(traceValue)}
              </pre>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
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
        { value: 'false', label: t('common.pins.false') },
        { value: 'true', label: t('common.pins.true') }
      ];
    }

    // Определяем текущее значение селекта с правильной обработкой пустых строк
    const currentValue = data[pin.id];
    const selectValue = (currentValue !== undefined && currentValue !== null && currentValue !== '')
      ? String(currentValue)
      : String(pin.defaultValue ?? options[0]?.value ?? '');

    return (
      <div className="relative flex items-center w-full gap-2 py-2 pl-1 pr-2">
        {pinContent}
        <Select
          value={selectValue}
          onValueChange={(value) => {
            const parsedValue = pin.type === 'Boolean' ? value === 'true' : value;
            updateNodeData(nodeId, { [pin.id]: parsedValue });
          }}
        >
          <SelectTrigger className="visual-editor-node-input nodrag h-8 w-[120px] text-sm">
            <SelectValue placeholder={t('common.placeholders.select')} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={String(option.value)} value={String(option.value)}>
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
      <div className="relative flex items-center w-full gap-2 py-2 pl-1 pr-2">
      {pinContent}
      <AutosizeInput
        className="visual-editor-node-input nodrag rounded-md py-1 px-2 text-sm resize-none overflow-hidden"
        value={data[pin.id] ?? ''}
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
  traceInputs = null,
  traceOutputs = null,
  isHighlighted = false,
  isActiveNode = false,
  isTraceActive = false,
  breakpoint = null,
  isPausedNode = false,
}) => {
  const { t } = useTranslation('visual-editor');
  const [isBreakpointDialogOpen, setIsBreakpointDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState(null);

  const debugMode = useVisualEditorStore(state => state.debugMode);
  const socket = useVisualEditorStore(state => state.socket);
  const command = useVisualEditorStore(state => state.command);
  const addBreakpoint = useVisualEditorStore(state => state.addBreakpoint);
  const removeBreakpoint = useVisualEditorStore(state => state.removeBreakpoint);
  const connectingPin = useVisualEditorStore(state => state.connectingPin);

  // Обработчик редактирования значения
  const handleEditValue = ({ nodeId, pinId, pinName, value, isInput }) => {
    setEditingValue({
      nodeId,
      pinId,
      pinName,
      value,
      isInput
    });
  };

  // Обработчик сохранения изменений
  const handleSaveValue = (newValue) => {
    if (!editingValue || !socket || !command) return;

    const { nodeId, pinId, isInput } = editingValue;

    // Формируем ключ для override
    // Формат: "nodeId.out.pinId" или "nodeId.in.pinId"
    const key = `${nodeId}.${isInput ? 'in' : 'out'}.${pinId}`;

    // Отправляем изменение через WebSocket
    socket.emit('debug:update-value', {
      botId: command.bot_id,
      graphId: command.id,
      key,
      value: newValue
    });

    setEditingValue(null);
  };
  // Разделяем пины на Exec и Data ОДИН РАЗ
  const { execInputs, dataInputs, execOutputs, dataOutputs } = useMemo(() => {
    return {
      execInputs: inputs.filter(p => p.type === 'Exec'),
      dataInputs: inputs.filter(p => p.type !== 'Exec'),
      execOutputs: outputs.filter(p => p.type === 'Exec'),
      dataOutputs: outputs.filter(p => p.type !== 'Exec'),
    };
  }, [inputs, outputs]);

  // Определяем, нужно ли затемнить ноду (trace активен, но нода не выполнялась)
  const shouldDim = isTraceActive && !isHighlighted && !isActiveNode;
  const shouldUseDefaultGraphAccent = !isHighlighted && !isActiveNode && !isPausedNode;

  // Обработчик правого клика для контекстного меню
  const handleContextMenu = (e) => {
    // Только в Live режиме разрешаем добавлять брейкпоинты
    if (debugMode !== 'live') return;

    e.preventDefault();
    e.stopPropagation();

    // Создаем простое контекстное меню
    const menu = document.createElement('div');
    menu.className = 'fixed z-[9999] bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-1';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    const menuItems = [];

    if (breakpoint) {
      menuItems.push({
        label: 'Edit Breakpoint',
        onClick: () => {
          setIsBreakpointDialogOpen(true);
          document.body.removeChild(menu);
        }
      });
      menuItems.push({
        label: 'Remove Breakpoint',
        onClick: () => {
          removeBreakpoint(nodeId);
          document.body.removeChild(menu);
        }
      });
    } else {
      menuItems.push({
        label: 'Add Breakpoint',
        onClick: () => {
          setIsBreakpointDialogOpen(true);
          document.body.removeChild(menu);
        }
      });
    }

    menuItems.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = 'w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 rounded';
      button.textContent = item.label;
      button.onclick = item.onClick;
      menu.appendChild(button);
      if (index < menuItems.length - 1) {
        const divider = document.createElement('div');
        divider.className = 'h-px bg-slate-600 my-1';
        menu.appendChild(divider);
      }
    });

    document.body.appendChild(menu);

    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "min-w-[20rem] !transform-none text-white transition-[box-shadow,border-color,background-color,opacity] duration-200 ease-out hover:!translate-y-0 hover:shadow-sm",
          isHighlighted && !isActiveNode && !isPausedNode && "border-green-500 border-2 shadow-lg shadow-green-500/50",
          isActiveNode && !isPausedNode && "border-green-400 border-[3px] shadow-xl shadow-green-400/70 ring-2 ring-green-400/30",
          isPausedNode && "border-amber-500 border-[3px] shadow-xl shadow-amber-500/70 ring-2 ring-amber-500/30",
          shouldDim && "opacity-40"
        )}
        style={{
          backgroundColor: 'hsl(var(--graph-surface))',
          ...(shouldUseDefaultGraphAccent ? { borderColor: 'hsl(var(--graph-header) / 0.72)' } : null),
        }}
        onContextMenu={handleContextMenu}
      >
        <CardHeader className={cn(
          "p-2 rounded-t-lg relative",
          isHighlighted && !isActiveNode && !isPausedNode && "bg-green-900/30",
          isActiveNode && !isPausedNode && "bg-green-800/50",
          isPausedNode && "bg-amber-900/50"
        )}
        style={shouldUseDefaultGraphAccent ? { backgroundColor: 'hsl(var(--graph-header))' } : undefined}>
          {/* Breakpoint click zone - только в Live режиме */}
          {debugMode === 'live' && (
            <div
              className="absolute left-0 top-0 bottom-0 z-10 flex w-6 items-center justify-center rounded-l-lg cursor-pointer hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                if (breakpoint) {
                  removeBreakpoint(nodeId);
                } else {
                  addBreakpoint(nodeId, null);
                }
              }}
              title={breakpoint ? "Remove breakpoint" : "Add breakpoint"}
            >
              {breakpoint ? (
                <Circle
                  className={cn(
                    "w-3 h-3",
                    breakpoint.enabled
                      ? "fill-red-500 text-red-500"
                      : "fill-gray-500 text-gray-500"
                  )}
                />
              ) : (
                <Circle className="w-3 h-3 text-slate-500/50" />
              )}
            </div>
          )}
          {/* Trace mode - только показываем индикатор */}
          {debugMode !== 'live' && breakpoint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-2 left-2">
                  <Circle
                    className={cn(
                      "w-3 h-3",
                      breakpoint.enabled
                        ? "fill-red-500 text-red-500"
                        : "fill-gray-500 text-gray-500"
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
                <p className="text-xs">
                  {breakpoint.enabled ? '🔴 Breakpoint enabled' : '⚫ Breakpoint disabled'}
                  {breakpoint.condition && (
                    <>
                      <br />
                      Condition: <code className="text-blue-300">{breakpoint.condition}</code>
                    </>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {isHighlighted && !isActiveNode && (
            <div className="absolute top-2 right-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          )}
          {isActiveNode && (
            <div className="absolute top-2 right-2 animate-pulse">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
          )}
          <CardTitle className="text-sm text-center">{label}</CardTitle>
          {description && (
            <p className="text-xs text-slate-300 text-center mt-1 leading-tight">
              {description}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-3 py-2 flex flex-col">
          {/* Pins Section */}
          <div className="flex w-full justify-between gap-5">
            {/* Input Pins */}
            <div className="inputs flex min-w-[9.5rem] flex-1 flex-col items-start pl-3">
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
                  traceValue={traceInputs?.[pin.id]}
                  onEditValue={handleEditValue}
                  debugMode={debugMode}
                  connectingPin={connectingPin}
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
                  traceValue={traceInputs?.[pin.id]}
                  onEditValue={handleEditValue}
                  debugMode={debugMode}
                  connectingPin={connectingPin}
                />
              ))}
            </div>

            {/* Output Pins */}
            <div className="outputs flex min-w-[8.5rem] shrink-0 flex-col items-end pr-4">
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
                  traceValue={traceOutputs?.[pin.id]}
                  onEditValue={handleEditValue}
                  debugMode={debugMode}
                  connectingPin={connectingPin}
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
                  traceValue={traceOutputs?.[pin.id]}
                  onEditValue={handleEditValue}
                  debugMode={debugMode}
                  connectingPin={connectingPin}
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

      {/* Breakpoint Dialog */}
      <BreakpointDialog
        isOpen={isBreakpointDialogOpen}
        onClose={() => setIsBreakpointDialogOpen(false)}
        nodeId={nodeId}
      />

      {/* Value Editor */}
      {editingValue && (
        <ValueEditor
          isOpen={true}
          onClose={() => setEditingValue(null)}
          value={editingValue.value}
          onSave={handleSaveValue}
          title={t('debugPanel.editValue')}
          pinName={editingValue.pinName}
        />
      )}
    </TooltipProvider>
  );
};

export default React.memo(BaseNode);
