import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды navigation:go_to_player
 * Перемещает бота к указанному игроку
 */
export const navigationGoToPlayerDefinition = new NodeDefinition({
  type: 'navigation:go_to_player',
  category: 'navigation',
  label: 'Идти к игроку',
  description: 'Перемещает бота к указанному игроку',



  defaultData: {
    playerName: '',
    range: 2,
  },

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationGoToPlayerDefinition;
