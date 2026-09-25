import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:send_message
 * Отправка сообщения с инлайн-полями для ввода
 */
export const actionSendMessageDefinition = new NodeDefinition({
  type: 'action:send_message',
  category: 'action',
  label: 'Отправить сообщение',
  description: 'Отправляет сообщение в чат. Поддерживает переменные в формате {varName}',



  defaultData: {
    chat_type: '',
    message: '',
    recipient: '',
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionSendMessageDefinition;
