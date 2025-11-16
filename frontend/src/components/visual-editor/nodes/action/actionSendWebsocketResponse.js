import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:send_websocket_response
 * Отправляет данные обратно клиенту через WebSocket API
 */
export const actionSendWebsocketResponseDefinition = new NodeDefinition({
  type: 'action:send_websocket_response',
  category: 'action',
  label: 'WebSocket Ответ',
  description: 'Отправляет ответ клиенту через WebSocket API',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'data', name: 'Данные', type: 'Wildcard', description: 'Данные для отправки', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
  ],

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionSendWebsocketResponseDefinition;
