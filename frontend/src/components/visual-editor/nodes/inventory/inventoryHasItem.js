import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:has_item
 * Проверяет наличие предмета в инвентаре
 */
export const inventoryHasItemDefinition = new NodeDefinition({
  type: 'inventory:has_item',
  category: 'inventory',
  label: 'Есть предмет?',
  description: 'Проверяет есть ли указанный предмет в инвентаре в нужном количестве',



  defaultData: {
    itemName: '',
    minCount: 1,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryHasItemDefinition;
