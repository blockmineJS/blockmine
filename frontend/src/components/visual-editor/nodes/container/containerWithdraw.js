import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:withdraw
 * Забирает предмет из открытого контейнера
 */
export const containerWithdrawDefinition = new NodeDefinition({
  type: 'container:withdraw',
  category: 'container',
  label: '📦 Контейнер: забрать',
  description: 'Забирает предмет из контейнера в инвентарь',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'itemName',
      name: 'Предмет',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'diamond, iron_ingot...',
      description: 'Имя предмета для забора'
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
      id: 'withdrawn',
      name: 'Забрано',
      type: 'Number',
      description: 'Сколько предметов забрано'
    },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если хоть что-то забрано'
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

export default containerWithdrawDefinition;
