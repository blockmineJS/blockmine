import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:get_held_item
 * Получает предмет в руке бота
 */
export const inventoryGetHeldItemDefinition = new NodeDefinition({
  type: 'inventory:get_held_item',
  category: 'inventory',
  label: '✋ Предмет в руке',
  description: 'Получает предмет который бот держит в руке',

  computeInputs: (data) => [
    {
      id: 'hand',
      name: 'Рука',
      type: 'String',
      required: false,
      inlineField: true,
      inlineFieldType: 'select',
      inlineFieldOptions: [
        { value: 'main', label: 'Основная' },
        { value: 'off', label: 'Вторая (офхенд)' },
      ],
      description: 'Какую руку проверить'
    },
  ],

  computeOutputs: (data) => [
    {
      id: 'item',
      name: 'Предмет',
      type: 'Object',
      description: 'Объект предмета или null'
    },
    {
      id: 'name',
      name: 'Имя',
      type: 'String',
      description: 'Имя предмета'
    },
    {
      id: 'count',
      name: 'Количество',
      type: 'Number',
      description: 'Количество в стаке'
    },
    {
      id: 'hasItem',
      name: 'Есть предмет?',
      type: 'Boolean',
      description: 'true если в руке есть предмет'
    },
  ],

  defaultData: {
    hand: 'main',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryGetHeldItemDefinition;
