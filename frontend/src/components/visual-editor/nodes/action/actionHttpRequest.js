import { NodeDefinition } from '../../core/registry';
import ActionHttpRequestSettings from './ActionHttpRequestSettings';

/**
 * Определение ноды action:http_request
 * HTTP запрос с различными методами
 */
export const actionHttpRequestDefinition = new NodeDefinition({
  type: 'action:http_request',
  category: 'action',
  label: 'HTTP Запрос',
  description: 'Выполняет HTTP запрос',

  computeInputs: (data) => {
    const inputs = [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      {
        id: 'url',
        name: 'URL',
        type: 'String',
        description: 'URL для запроса',
        required: false,
        inlineField: true,
        placeholder: 'https://...'
      },
      {
        id: 'method',
        name: 'Method',
        type: 'String',
        description: 'HTTP метод',
        required: false,
        inlineField: true,
        placeholder: 'GET'
      },
    ];

    const method = data.method || 'GET';

    // Body только для методов которые его поддерживают
    if (method !== 'GET' && method !== 'DELETE') {
      inputs.push({
        id: 'body',
        name: 'Body',
        type: 'Wildcard',
        description: 'Тело запроса',
        required: false,
        inlineField: true,
        placeholder: '{...}'
      });
    }

    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'exec', name: 'Exec', type: 'Exec', description: 'Выполняется после запроса' },
    { id: 'response', name: 'Response', type: 'Object', description: 'Ответ сервера' },
    { id: 'error', name: 'Error', type: 'String', description: 'Ошибка если есть' },
  ],

  SettingsComponent: ActionHttpRequestSettings,

  defaultData: {
    method: 'GET',
    url: '',
    body: '',
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionHttpRequestDefinition;
