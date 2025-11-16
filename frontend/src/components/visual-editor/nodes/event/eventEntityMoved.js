import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:entityMoved
 * Срабатывает когда сущность перемещается
 */
export const eventEntityMovedDefinition = new NodeDefinition({
  type: 'event:entityMoved',
  category: 'event',
  label: '🧍 Сущность подвинулась',
  description: 'Вызывается, когда любая сущность перемещается',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'entity', name: 'Сущность', type: 'Object' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventEntityMovedDefinition;
