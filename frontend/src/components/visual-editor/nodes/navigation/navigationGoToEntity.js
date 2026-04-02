import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды navigation:go_to_entity
 * Перемещает бота к указанной сущности
 */
export const navigationGoToEntityDefinition = new NodeDefinition({
  type: 'navigation:go_to_entity',
  category: 'navigation',
  label: 'Идти к сущности',
  description: 'Перемещает бота к указанной сущности (моб, животное)',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'entity',
      name: 'Сущность',
      type: 'Object',
      required: true,
      description: 'Объект сущности (из "Существа рядом")'
    },
    {
      id: 'range',
      name: 'Радиус',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '2',
      description: 'На каком расстоянии остановиться'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Дошёл', type: 'Exec' },
    { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если бот дошёл до сущности'
    },
  ],

  defaultData: {
    range: 2,
  },

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationGoToEntityDefinition;
