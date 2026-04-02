import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:deposit
 * Кладёт предмет в открытый контейнер
 */
export const containerDepositDefinition = new NodeDefinition({
  type: 'container:deposit',
  category: 'container',
  label: 'Контейнер: положить',
  description: 'Кладёт предмет из инвентаря в открытый контейнер',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'itemName',
      name: 'Предмет',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'diamond, iron_ingot...',
      description: 'Имя предмета для перемещения'
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
    { id: 'exec', name: 'Готово', type: 'Exec' },
    { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
    {
      id: 'deposited',
      name: 'Положено',
      type: 'Number',
      description: 'Сколько предметов положено'
    },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если хоть что-то положено'
    },
  ],

  defaultData: {
    itemName: '',
    count: null,
  },

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerDepositDefinition;
