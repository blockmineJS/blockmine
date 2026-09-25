import { NodeDefinition } from '../../core/registry';
import LogicCompareSettings from './LogicCompareSettings';

/**
 * Определение ноды logic:compare
 * Сравнение значений
 */
export const logicCompareDefinition = new NodeDefinition({
  type: 'logic:compare',
  category: 'logic',
  label: 'Сравнение',
  description: 'Сравнение двух значений',



  SettingsComponent: LogicCompareSettings,

  defaultData: {
    operation: '==',
    a: '',
    b: '',
  },

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default logicCompareDefinition;
