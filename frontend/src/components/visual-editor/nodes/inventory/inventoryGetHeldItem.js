import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:get_held_item
 * Получает предмет в руке бота
 */
export const inventoryGetHeldItemDefinition = new NodeDefinition({
  type: 'inventory:get_held_item',
  category: 'inventory',
  label: 'Предмет в руке',
  description: 'Получает предмет который бот держит в руке',



  defaultData: {
    hand: 'main',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryGetHeldItemDefinition;
