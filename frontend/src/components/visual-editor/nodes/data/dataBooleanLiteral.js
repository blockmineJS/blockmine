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



  defaultData: {
    value: false,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataBooleanLiteralDefinition;
