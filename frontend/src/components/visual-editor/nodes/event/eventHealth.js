import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:health
 * Срабатывает при изменении здоровья, голода или насыщения
 */
export const eventHealthDefinition = new NodeDefinition({
  type: 'event:health',
  category: 'event',
  label: 'Здоровье/Голод изменилось',
  description: 'Срабатывает при изменении здоровья, голода или насыщения бота',



  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventHealthDefinition;
