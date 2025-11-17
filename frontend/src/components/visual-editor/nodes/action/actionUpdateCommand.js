import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:update_command
 * Редактирует существующую команду
 */
export const actionUpdateCommandDefinition = new NodeDefinition({
  type: 'action:update_command',
  category: 'action',
  label: '✏️ Редактировать команду',
  description: 'Изменяет параметры существующей команды',

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
    {
      id: 'newName',
      name: 'Новое имя',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'newcommand'
    },
    {
      id: 'description',
      name: 'Описание',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Новое описание'
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
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
    { id: 'success', name: 'Успешно', type: 'Boolean' },
  ],

  defaultData: {
    commandName: '',
    newName: '',
    description: '',
    aliases: '[]',
    cooldown: 0,
    allowedChatTypes: '["chat", "private", "local", "global"]',
    permissionName: '',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default actionUpdateCommandDefinition;
