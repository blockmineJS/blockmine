import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:delete_command
 * Удаляет существующую команду
 */
export const actionDeleteCommandDefinition = new NodeDefinition({
  type: 'action:delete_command',
  category: 'action',
  label: 'Удалить команду',
  description: 'Удаляет существующую команду бота',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'commandName',
      name: 'Имя команды',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'mycommand'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
    { id: 'success', name: 'Успешно', type: 'Boolean' },
  ],

  defaultData: {
    commandName: '',
  },

  theme: {
    headerColor: '#ef4444',
    accentColor: '#f87171',
  },
});

export default actionDeleteCommandDefinition;
