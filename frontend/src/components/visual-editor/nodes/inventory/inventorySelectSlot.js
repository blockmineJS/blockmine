import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:select_slot
 * Выбирает слот хотбара (переключает предмет в руке)
 */
export const inventorySelectSlotDefinition = new NodeDefinition({
  type: 'inventory:select_slot',
  category: 'inventory',
  label: 'Выбрать слот',
  description: 'Выбирает слот хотбара (0-8), переключая активный предмет в руке',



  defaultData: {
    slot: 0,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventorySelectSlotDefinition;
