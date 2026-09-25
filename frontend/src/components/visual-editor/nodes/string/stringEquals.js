import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:equals
 * Сравнивает две строки на равенство
 */
export const stringEqualsDefinition = new NodeDefinition({
  type: 'string:equals',
  category: 'string',
  label: 'Равно',
  description: 'Сравнивает две строки на равенство',



  defaultData: {
    a: '',
    b: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringEqualsDefinition;
