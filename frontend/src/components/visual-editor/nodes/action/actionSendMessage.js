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

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'chat_type',
      name: 'Тип чата',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'chat, whisper...'
    },
    {
      id: 'message',
      name: 'Сообщение',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Текст сообщения с {переменными}'
    },
    {
      id: 'recipient',
      name: 'Адресат',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Имя игрока'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
  ],

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
