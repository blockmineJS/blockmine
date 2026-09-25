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



  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionSendWebsocketResponseDefinition;
