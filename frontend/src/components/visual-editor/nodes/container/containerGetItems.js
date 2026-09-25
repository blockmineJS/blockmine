import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:get_items
 * Получает список предметов из открытого контейнера
 */
export const containerGetItemsDefinition = new NodeDefinition({
  type: 'container:get_items',
  category: 'container',
  label: 'Контейнер: содержимое',
  description: 'Получает список предметов из открытого контейнера',



  defaultData: {},

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerGetItemsDefinition;
