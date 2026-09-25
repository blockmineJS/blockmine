import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:get_slot
 * Получает предмет в указанном слоте инвентаря
 */
export const inventoryGetSlotDefinition = new NodeDefinition({
  type: 'inventory:get_slot',
  category: 'inventory',
  label: 'Получить слот',
  description: 'Получает предмет в указанном слоте инвентаря',



  defaultData: {
    slotNumber: 0,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryGetSlotDefinition;
