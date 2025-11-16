import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:send_message
 * Отправка сообщения с инлайн-полями для ввода
 */
export const actionSendMessageDefinition = new NodeDefinition({
  type: 'action:send_message',
  category: 'action',
  label: '🗣️ Отправить сообщение',
  description: 'Отправляет сообщение в чат. Поддерживает переменные в формате {varName}',

  computeInputs: (data) => {
    const baseInputs = [
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
        placeholder: 'Текст сообщения'
      },
      {
        id: 'recipient',
        name: 'Адресат',
        type: 'String',
        required: false,
        inlineField: true,
        placeholder: 'Имя игрока'
      },
    ];

    // Динамические входы для переменных в тексте сообщения
    const message = data.message || '';
    const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = [...message.matchAll(variablePattern)];
    const uniqueVars = [...new Set(matches.map(m => m[1]))];

    // Добавляем динамические входы для каждой уникальной переменной
    uniqueVars.forEach(varName => {
      if (!baseInputs.find(input => input.id === `var_${varName}`)) {
        baseInputs.push({
          id: `var_${varName}`,
          name: varName,
          type: 'Wildcard',
          required: false,
        });
      }
    });

    return baseInputs;
  },

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
