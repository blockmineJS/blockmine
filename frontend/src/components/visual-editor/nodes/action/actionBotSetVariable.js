import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:bot_set_variable
 * Сохраняет значение в переменную графа
 */
export const actionBotSetVariableDefinition = new NodeDefinition({
  type: 'action:bot_set_variable',
  category: 'action',
  label: 'Установить переменную',
  description: 'Записывает значение в переменную',



  defaultData: {
    value: '',
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionBotSetVariableDefinition;
