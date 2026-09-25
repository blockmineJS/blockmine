import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:equip
 * Экипирует предмет в указанный слот (рука, броня)
 */
export const inventoryEquipDefinition = new NodeDefinition({
  type: 'inventory:equip',
  category: 'inventory',
  label: 'Экипировать',
  description: 'Экипирует предмет в руку или слот брони',



  defaultData: {
    itemName: '',
    destination: 'hand',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryEquipDefinition;
