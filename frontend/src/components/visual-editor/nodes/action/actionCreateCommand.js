import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:create_command
 * Создает новую команду (временную или постоянную)
 */
export const actionCreateCommandDefinition = new NodeDefinition({
  type: 'action:create_command',
  category: 'action',
  label: '➕ Создать команду',
  description: 'Создает новую команду для бота (временную или постоянную)',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'name',
      name: 'Имя команды',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'mycommand'
    },
    {
      id: 'description',
      name: 'Описание',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Описание команды'
    },
    {
      id: 'aliases',
      name: 'Алиасы',
      type: 'Array',
      required: false,
      inlineField: true,
      placeholder: '["alias1", "alias2"]'
    },
    {
      id: 'cooldown',
      name: 'Кулдаун (сек)',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0'
    },
    {
      id: 'allowedChatTypes',
      name: 'Типы чата',
      type: 'Array',
      required: false,
      inlineField: true,
      placeholder: '["chat", "private"]'
    },
    {
      id: 'permissionName',
      name: 'Название права',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'moderator'
    },
    {
      id: 'temporary',
      name: 'Временная?',
      type: 'Boolean',
      required: false,
      inlineField: true,
      inlineFieldOptions: [
        { value: false, label: 'Постоянная' },
        { value: true, label: 'Временная' }
      ]
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
    { id: 'commandId', name: 'ID команды', type: 'Number' },
    { id: 'success', name: 'Успешно', type: 'Boolean' },
  ],

  defaultData: {
    name: '',
    description: '',
    aliases: '[]',
    cooldown: 0,
    allowedChatTypes: '["chat", "private"]',
    permissionName: '',
    temporary: false,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default actionCreateCommandDefinition;
