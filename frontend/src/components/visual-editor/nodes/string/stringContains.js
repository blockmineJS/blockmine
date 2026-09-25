import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:contains
 * Проверяет содержится ли подстрока в строке
 */
export const stringContainsDefinition = new NodeDefinition({
  type: 'string:contains',
  category: 'string',
  label: 'Содержит',
  description: 'Проверяет содержится ли подстрока в строке',



  defaultData: {
    haystack: '',
    needle: '',
    case_sensitive: false,
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringContainsDefinition;
