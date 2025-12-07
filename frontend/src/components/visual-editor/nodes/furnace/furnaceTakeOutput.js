import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:take_output
 * Забирает готовый предмет из слота результата печки
 */
export const furnaceTakeOutputDefinition = new NodeDefinition({
  type: 'furnace:take_output',
  category: 'furnace',
  label: '🔥 Печка: забрать результат',
  description: 'Забирает готовый предмет из слота результата печки',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Забрано', type: 'Exec' },
    { id: 'exec_failed', name: 'Пусто/Ошибка', type: 'Exec' },
    {
      id: 'item',
      name: 'Предмет',
      type: 'Object',
      description: 'Забранный предмет'
    },
    {
      id: 'count',
      name: 'Кол-во',
      type: 'Number',
      description: 'Количество забранных предметов'
    },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если предмет забран'
    },
  ],

  defaultData: {},

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnaceTakeOutputDefinition;
