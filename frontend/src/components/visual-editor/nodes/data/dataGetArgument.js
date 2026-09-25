import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_argument
 * Получает значение аргумента команды
 */
export const dataGetArgumentDefinition = new NodeDefinition({
  type: 'data:get_argument',
  category: 'data',
  label: 'Получить аргумент',
  description: 'Получить значение аргумента команды',



  defaultData: {
    argumentName: '',
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetArgumentDefinition;
