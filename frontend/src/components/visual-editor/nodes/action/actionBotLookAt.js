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



  defaultData: {
    add_y: 0,
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionBotLookAtDefinition;
