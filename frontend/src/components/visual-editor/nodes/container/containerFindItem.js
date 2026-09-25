import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:find_item
 * Ищет предмет в открытом контейнере
 */
export const containerFindItemDefinition = new NodeDefinition({
  type: 'container:find_item',
  category: 'container',
  label: 'Контейнер: найти предмет',
  description: 'Ищет предмет в открытом контейнере',



  defaultData: {
    itemName: '',
  },

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerFindItemDefinition;
