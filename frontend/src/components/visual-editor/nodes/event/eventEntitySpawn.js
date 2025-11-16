import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:entitySpawn
 * Срабатывает когда сущность появляется в зоне видимости
 */
export const eventEntitySpawnDefinition = new NodeDefinition({
  type: 'event:entitySpawn',
  category: 'event',
  label: '📦 Сущность появилась',
  description: 'Вызывается, когда новая сущность появляется в поле зрения бота',

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

export default eventEntitySpawnDefinition;
