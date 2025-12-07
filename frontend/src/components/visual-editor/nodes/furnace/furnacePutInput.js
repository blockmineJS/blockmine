import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:put_input
 * Кладёт предмет в слот плавки печки
 */
export const furnacePutInputDefinition = new NodeDefinition({
  type: 'furnace:put_input',
  category: 'furnace',
  label: '🔥 Печка: положить для плавки',
  description: 'Кладёт предмет в слот плавки печки',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'itemName',
      name: 'Предмет',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'iron_ore',
      description: 'Название предмета для плавки'
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
      description: 'true если предмет положен'
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

export default furnacePutInputDefinition;
