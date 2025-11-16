import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:health
 * Срабатывает при изменении здоровья, голода или насыщения
 */
export const eventHealthDefinition = new NodeDefinition({
  type: 'event:health',
  category: 'event',
  label: '❤️ Здоровье/Голод изменилось',
  description: 'Срабатывает при изменении здоровья, голода или насыщения бота',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'health', name: 'Здоровье', type: 'Number' },
    { id: 'food', name: 'Голод', type: 'Number' },
    { id: 'saturation', name: 'Насыщение', type: 'Number' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventHealthDefinition;
