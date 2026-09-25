import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:starts_with
 * Проверяет начинается ли строка с префикса
 */
export const stringStartsWithDefinition = new NodeDefinition({
  type: 'string:starts_with',
  category: 'string',
  label: 'Начинается с',
  description: 'Проверяет начинается ли строка с префикса',



  defaultData: {
    text: '',
    prefix: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringStartsWithDefinition;
