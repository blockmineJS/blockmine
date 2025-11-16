import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:boolean_literal
 * Значение Истина/Ложь
 */
export const dataBooleanLiteralDefinition = new NodeDefinition({
  type: 'data:boolean_literal',
  category: 'data',
  label: 'Boolean',
  description: 'Булево значение (true/false)',

  computeInputs: (data) => [
    {
      id: 'value',
      name: 'Значение',
      type: 'Boolean',
      required: false,
      inlineField: true,
      placeholder: 'false'
    },
  ],

  computeOutputs: (data) => [
    { id: 'value', name: 'Значение', type: 'Boolean', description: 'Булево значение' },
  ],

  defaultData: {
    value: false,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataBooleanLiteralDefinition;
