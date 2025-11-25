import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды logic:not
 * Инвертирует boolean значение
 */
export const logicNotDefinition = new NodeDefinition({
  type: 'logic:not',
  category: 'logic',
  label: '! НЕ',
  description: 'Инвертирует boolean значение (NOT)',

  computeInputs: (data) => [
    {
      id: 'value',
      name: 'Значение',
      type: 'Boolean',
      required: false,
      inlineField: true,
      placeholder: 'true/false'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean', description: 'Инвертированное значение' },
  ],

  defaultData: {
    value: '',
  },

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default logicNotDefinition;
