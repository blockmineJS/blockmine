import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:playerLeft
 * Срабатывает когда игрок покидает сервер
 */
export const eventPlayerLeftDefinition = new NodeDefinition({
  type: 'event:playerLeft',
  category: 'event',
  label: 'Игрок вышел',
  description: 'Срабатывает, когда игрок покидает сервер',



  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventPlayerLeftDefinition;
