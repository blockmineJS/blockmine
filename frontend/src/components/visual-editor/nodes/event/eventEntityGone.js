import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:entityGone
 * Срабатывает когда сущность пропадает из зоны видимости
 */
export const eventEntityGoneDefinition = new NodeDefinition({
  type: 'event:entityGone',
  category: 'event',
  label: '❌ Сущность исчезла',
  description: 'Вызывается, когда сущность пропадает из зоны видимости бота',

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

export default eventEntityGoneDefinition;
