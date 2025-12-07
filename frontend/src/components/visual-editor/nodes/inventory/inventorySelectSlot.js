import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:select_slot
 * Выбирает слот хотбара (переключает предмет в руке)
 */
export const inventorySelectSlotDefinition = new NodeDefinition({
  type: 'inventory:select_slot',
  category: 'inventory',
  label: '🎯 Выбрать слот',
  description: 'Выбирает слот хотбара (0-8), переключая активный предмет в руке',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'slot',
      name: 'Слот',
      type: 'Number',
      required: true,
      inlineField: true,
      placeholder: '0-8',
      description: 'Номер слота хотбара (0-8)'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
    {
      id: 'item',
      name: 'Предмет',
      type: 'Object',
      description: 'Предмет в выбранном слоте (или null)'
    },
  ],

  defaultData: {
    slot: 0,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventorySelectSlotDefinition;
