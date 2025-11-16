import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды debug:log
 * Выводит значение в консоль терминала
 */
export const debugLogDefinition = new NodeDefinition({
  type: 'debug:log',
  category: 'debug',
  label: 'Отладка',
  description: 'Выводит значение в консоль сервера',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'value',
      name: 'Значение',
      type: 'Wildcard',
      description: 'Значение для вывода',
      required: false,
      inlineField: true,
      placeholder: '...'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
  ],

  defaultData: {
    value: '',
  },

  theme: {
    headerColor: '#6366f1',
    accentColor: '#818cf8',
  },
});

export default debugLogDefinition;
