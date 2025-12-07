import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:has_item
 * Проверяет наличие предмета в инвентаре
 */
export const inventoryHasItemDefinition = new NodeDefinition({
  type: 'inventory:has_item',
  category: 'inventory',
  label: '❓ Есть предмет?',
  description: 'Проверяет есть ли указанный предмет в инвентаре в нужном количестве',

  computeInputs: (data) => [
    {
      id: 'itemName',
      name: 'Имя предмета',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'diamond, iron_ingot...',
      description: 'Имя предмета для проверки'
    },
    {
      id: 'minCount',
      name: 'Мин. кол-во',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '1',
      description: 'Минимальное требуемое количество (по умолчанию 1)'
    },
  ],

  computeOutputs: (data) => [
    {
      id: 'hasItem',
      name: 'Есть?',
      type: 'Boolean',
      description: 'true если предмет есть в нужном количестве'
    },
    {
      id: 'actualCount',
      name: 'Фактически',
      type: 'Number',
      description: 'Фактическое количество предмета'
    },
  ],

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
