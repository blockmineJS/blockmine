import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:close
 * Закрывает открытый контейнер
 */
export const containerCloseDefinition = new NodeDefinition({
  type: 'container:close',
  category: 'container',
  label: 'Контейнер: закрыть',
  description: 'Закрывает текущий открытый контейнер',



  defaultData: {},

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerCloseDefinition;
