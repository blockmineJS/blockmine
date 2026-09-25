import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:matches
 * Проверяет совпадение строки с regex паттерном
 */
export const stringMatchesDefinition = new NodeDefinition({
  type: 'string:matches',
  category: 'string',
  label: 'Совпадает',
  description: 'Проверяет совпадение строки с regex паттерном',



  defaultData: {
    text: '',
    pattern: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringMatchesDefinition;
