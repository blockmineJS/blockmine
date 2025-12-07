import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:find_item
 * Ищет предмет в инвентаре по имени
 */
export const inventoryFindItemDefinition = new NodeDefinition({
  type: 'inventory:find_item',
  category: 'inventory',
  label: '🔍 Найти предмет',
  description: 'Ищет предмет в инвентаре по имени и возвращает информацию о нём',

  computeInputs: (data) => [
    {
      id: 'itemName',
      name: 'Имя предмета',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'diamond, stone, oak_log...',
      description: 'Имя предмета (minecraft id без префикса)'
    },
  ],

  computeOutputs: (data) => [
    {
      id: 'item',
      name: 'Предмет',
      type: 'Object',
      description: 'Объект предмета {name, count, slot, metadata}'
    },
    {
      id: 'found',
      name: 'Найден?',
      type: 'Boolean',
      description: 'true если предмет найден'
    },
    {
      id: 'slot',
      name: 'Слот',
      type: 'Number',
      description: 'Номер слота где найден предмет'
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

export default inventoryFindItemDefinition;
