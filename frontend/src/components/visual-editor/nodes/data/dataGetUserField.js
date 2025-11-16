import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_user_field
 * Получает различные данные из объекта пользователя
 */
export const dataGetUserFieldDefinition = new NodeDefinition({
  type: 'data:get_user_field',
  category: 'data',
  label: 'Поле пользователя',
  description: 'Данные пользователя',

  computeInputs: (data) => [
    { id: 'user', name: 'Пользователь', type: 'User', description: 'Объект пользователя', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'username', name: 'Никнейм', type: 'String' },
    { id: 'groups', name: 'Группы', type: 'Array' },
    { id: 'permissions', name: 'Права', type: 'Array' },
    { id: 'isBlacklisted', name: 'В черном списке', type: 'Boolean' },
  ],

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetUserFieldDefinition;
