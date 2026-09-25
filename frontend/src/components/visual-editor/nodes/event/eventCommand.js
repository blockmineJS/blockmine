import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:command
 * Стартовая точка для графа команды
 */
export const eventCommandDefinition = new NodeDefinition({
  type: 'event:command',
  category: 'event',
  label: '▶️ При выполнении команды',
  description: 'Стартовая точка для графа команды',



  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventCommandDefinition;
