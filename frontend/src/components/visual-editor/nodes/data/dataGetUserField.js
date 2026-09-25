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



  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetUserFieldDefinition;
