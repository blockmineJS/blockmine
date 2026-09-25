import { NodeDefinition } from '../../core/registry';
import TimeCompareSettings from './TimeCompareSettings';

/**
 * Определение ноды time:compare
 * Сравнивает две даты
 */
export const timeCompareDefinition = new NodeDefinition({
  type: 'time:compare',
  category: 'time',
  label: 'Сравнить даты',
  description: 'Сравнивает две даты',



  SettingsComponent: TimeCompareSettings,

  defaultData: {
    operation: 'before',
  },

  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeCompareDefinition;
