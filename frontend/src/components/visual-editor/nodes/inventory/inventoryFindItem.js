import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:find_item
 * Ищет предмет в инвентаре по имени
 */
export const inventoryFindItemDefinition = new NodeDefinition({
  type: 'inventory:find_item',
  category: 'inventory',
  label: 'Найти предмет',
  description: 'Ищет предмет в инвентаре по имени и возвращает информацию о нём',



  defaultData: {
    itemName: '',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryFindItemDefinition;
