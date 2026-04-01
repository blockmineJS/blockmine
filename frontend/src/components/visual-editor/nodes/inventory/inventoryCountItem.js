import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:count_item
 * Подсчитывает общее количество предмета в инвентаре
 */
export const inventoryCountItemDefinition = new NodeDefinition({
  type: 'inventory:count_item',
  category: 'inventory',
  label: 'Подсчитать предмет',
  description: 'Подсчитывает общее количество указанного предмета во всём инвентаре',

  computeInputs: (data) => [
    {
      id: 'itemName',
      name: 'Имя предмета',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'diamond, cobblestone...',
      description: 'Имя предмета для подсчёта'
    },
  ],

  computeOutputs: (data) => [
    {
      id: 'count',
      name: 'Количество',
      type: 'Number',
      description: 'Общее количество предмета в инвентаре'
    },
  ],

  defaultData: {
    itemName: '',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryCountItemDefinition;
