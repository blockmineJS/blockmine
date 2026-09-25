import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:number_literal
 * Простое числовое значение
 */
export const dataNumberLiteralDefinition = new NodeDefinition({
  type: 'data:number_literal',
  category: 'data',
  label: 'Число',
  description: 'Простое числовое значение.',



  defaultData: {
    value: 0,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataNumberLiteralDefinition;
