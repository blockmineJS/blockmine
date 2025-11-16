import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:bot_look_at
 * Поворачивает голову бота в сторону координат или сущности
 */
export const actionBotLookAtDefinition = new NodeDefinition({
  type: 'action:bot_look_at',
  category: 'action',
  label: 'Посмотреть на',
  description: 'Поворачивает голову бота на цель',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'target', name: 'Цель', type: 'Object', description: 'Позиция или сущность', required: true },
    {
      id: 'add_y',
      name: 'Прибавить к Y',
      type: 'Number',
      description: 'Корректировка по Y',
      required: false,
      inlineField: true,
      placeholder: '0'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
  ],

  defaultData: {
    add_y: 0,
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionBotLookAtDefinition;
