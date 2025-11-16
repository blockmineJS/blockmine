import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:websocket_call
 * Срабатывает при вызове графа через WebSocket API
 */
export const eventWebsocketCallDefinition = new NodeDefinition({
  type: 'event:websocket_call',
  category: 'event',
  label: '📡 Вызов из WebSocket API',
  description: 'Срабатывает, когда граф вызывается через WebSocket API методом callGraph()',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'graphName', name: 'Имя графа', type: 'String' },
    { id: 'data', name: 'Данные', type: 'Object' },
    { id: 'socketId', name: 'Socket ID', type: 'String' },
    { id: 'keyPrefix', name: 'API ключ (префикс)', type: 'String' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventWebsocketCallDefinition;
