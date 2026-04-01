import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:drop
 * Выбрасывает предмет из инвентаря
 */
export const inventoryDropDefinition = new NodeDefinition({
  type: 'inventory:drop',
  category: 'inventory',
  label: 'Выбросить',
  description: 'Выбрасывает предмет из инвентаря на землю',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'itemName',
      name: 'Предмет',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'dirt, cobblestone...',
      description: 'Имя предмета для выброса'
    },
    {
      id: 'count',
      name: 'Количество',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: 'все',
      description: 'Сколько выбросить (пусто = весь стак)'
    },
    {
      id: 'dropAll',
      name: 'Выбросить все?',
      type: 'Boolean',
      required: false,
      inlineField: true,
      inlineFieldType: 'select',
      inlineFieldOptions: [
        { value: false, label: 'Один стак' },
        { value: true, label: 'Все предметы' },
      ],
      description: 'Выбросить все такие предметы из инвентаря'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
    {
      id: 'dropped',
      name: 'Выброшено',
      type: 'Number',
      description: 'Сколько предметов выброшено'
    },
  ],

  defaultData: {
    itemName: '',
    count: null,
    dropAll: false,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryDropDefinition;
