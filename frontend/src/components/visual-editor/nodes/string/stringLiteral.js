import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:string_literal
 * Строковый литерал с поддержкой переменных
 */
export const stringLiteralDefinition = new NodeDefinition({
  type: 'data:string_literal',
  category: 'string',
  label: 'Строка',
  description: 'Строка с поддержкой переменных {name}',



  defaultData: {
    value: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringLiteralDefinition;
