import { NodeDefinition } from '../../core/registry';
import NavigationGoToSettings from './NavigationGoToSettings';

/**
 * Определение ноды navigation:go_to
 * Перемещает бота к указанным координатам
 */
export const navigationGoToDefinition = new NodeDefinition({
  type: 'navigation:go_to',
  category: 'navigation',
  label: 'Идти к',
  description: 'Перемещает бота к указанным координатам используя pathfinding',



  SettingsComponent: NavigationGoToSettings,

  defaultData: {
    x: 0,
    y: 64,
    z: 0,
    range: 1,
  },

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationGoToDefinition;
