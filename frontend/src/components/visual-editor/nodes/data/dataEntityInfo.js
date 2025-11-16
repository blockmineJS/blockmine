import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:entity_info
 * Извлекает данные из объекта существа
 */
export const dataEntityInfoDefinition = new NodeDefinition({
  type: 'data:entity_info',
  category: 'data',
  label: 'Информация о сущности',
  description: 'Информация о существе',

  computeInputs: (data) => [
    { id: 'entity', name: 'Существо', type: 'Object', description: 'Объект существа', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'type', name: 'Тип', type: 'String' },
    { id: 'username', name: 'Имя', type: 'String' },
    { id: 'distance', name: 'Расстояние', type: 'Number' },
    { id: 'position', name: 'Позиция', type: 'Object' },
    { id: 'id', name: 'ID', type: 'Number' },
    { id: 'isPlayer', name: 'Это игрок?', type: 'Boolean' },
  ],

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataEntityInfoDefinition;
