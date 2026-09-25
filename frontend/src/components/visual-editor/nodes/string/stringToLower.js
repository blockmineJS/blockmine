import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:to_lower
 * Преобразует строку в нижний регистр
 */
export const stringToLowerDefinition = new NodeDefinition({
  type: 'string:to_lower',
  category: 'string',
  label: 'В нижний регистр',
  description: 'Преобразует строку в нижний регистр (lowercase)',



  defaultData: {
    text: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringToLowerDefinition;
