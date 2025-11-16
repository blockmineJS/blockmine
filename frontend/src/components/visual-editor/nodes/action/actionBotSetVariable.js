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

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'name',
      name: 'Имя',
      type: 'String',
      description: 'Имя переменной',
      required: false,
      inlineField: true,
      inlineFieldType: 'select',
      inlineFieldOptions: (context) => {
        const variables = context.variables || [];
        return variables
          .filter(v => v.name)
          .map(v => ({
            value: v.name,
            label: `${v.name} (${v.type})`
          }));
      },
      placeholder: 'имя_переменной'
    },
    {
      id: 'value',
      name: 'Значение',
      type: 'Wildcard',
      required: false,
      inlineField: true,
      placeholder: '...'
    },
    {
      id: 'persist',
      name: 'Хранить в БД?',
      type: 'Boolean',
      required: false,
      inlineField: true,
      inlineFieldOptions: [
        { value: 'false', label: 'Нет' },
        { value: 'true', label: 'Да' }
      ]
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
  ],

  defaultData: {
    name: '',
    value: '',
    persist: false,
  },

  theme: {
    headerColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
});

export default actionBotSetVariableDefinition;
