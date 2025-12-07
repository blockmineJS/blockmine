import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:equip
 * Экипирует предмет в указанный слот (рука, броня)
 */
export const inventoryEquipDefinition = new NodeDefinition({
  type: 'inventory:equip',
  category: 'inventory',
  label: '⚔️ Экипировать',
  description: 'Экипирует предмет в руку или слот брони',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'itemName',
      name: 'Предмет',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'diamond_sword, iron_helmet...',
      description: 'Имя предмета для экипировки'
    },
    {
      id: 'destination',
      name: 'Куда',
      type: 'String',
      required: false,
      inlineField: true,
      inlineFieldType: 'select',
      inlineFieldOptions: [
        { value: 'hand', label: 'Рука' },
        { value: 'off-hand', label: 'Вторая рука' },
        { value: 'head', label: 'Голова' },
        { value: 'torso', label: 'Нагрудник' },
        { value: 'legs', label: 'Поножи' },
        { value: 'feet', label: 'Ботинки' },
      ],
      description: 'Куда экипировать предмет'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если предмет успешно экипирован'
    },
  ],

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
