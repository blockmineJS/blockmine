import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_entity_field
 * Получает определенное поле из объекта сущности
 */
export const dataGetEntityFieldDefinition = new NodeDefinition({
  type: 'data:get_entity_field',
  category: 'data',
  label: 'Поле сущности',
  description: 'Получает поля из объекта сущности',

  computeInputs: (data) => [
    { id: 'entity', name: 'Сущность', type: 'Object', description: 'Объект сущности', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'username', name: 'Никнейм', type: 'String' },
    { id: 'type', name: 'Тип', type: 'String' },
    { id: 'position', name: 'Позиция', type: 'Object' },
    { id: 'isValid', name: 'Валидна', type: 'Boolean' },
  ],

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetEntityFieldDefinition;
