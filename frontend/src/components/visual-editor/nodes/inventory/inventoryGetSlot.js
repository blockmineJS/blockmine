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

  computeInputs: (data) => [
    {
      id: 'slotNumber',
      name: 'Номер слота',
      type: 'Number',
      required: true,
      inlineField: true,
      placeholder: '0-44',
      description: 'Номер слота (0-8 хотбар, 9-35 инвентарь, 36-39 броня, 40 офхенд)'
    },
  ],

  computeOutputs: (data) => [
    {
      id: 'item',
      name: 'Предмет',
      type: 'Object',
      description: 'Объект предмета или null если слот пуст'
    },
    {
      id: 'isEmpty',
      name: 'Пусто?',
      type: 'Boolean',
      description: 'true если слот пустой'
    },
  ],

  defaultData: {
    slotNumber: 0,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryGetSlotDefinition;
