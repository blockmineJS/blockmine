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

  computeInputs: (data) => [
    { id: 'date_left', name: 'Дата А', type: 'DateTime', required: true },
    { id: 'date_right', name: 'Дата Б', type: 'DateTime', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Результат', type: 'Boolean' },
  ],

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
