import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:put_fuel
 * Кладёт топливо в слот топлива печки
 */
export const furnacePutFuelDefinition = new NodeDefinition({
  type: 'furnace:put_fuel',
  category: 'furnace',
  label: 'Печка: положить топливо',
  description: 'Кладёт топливо в слот топлива печки',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'itemName',
      name: 'Топливо',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'coal',
      description: 'Название топлива (coal, charcoal, etc.)'
    },
    {
      id: 'count',
      name: 'Кол-во',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: 'Все',
      description: 'Количество (пусто = все)'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Положено', type: 'Exec' },
    { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если топливо положено'
    },
  ],

  defaultData: {
    itemName: '',
    count: null,
  },

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnacePutFuelDefinition;
