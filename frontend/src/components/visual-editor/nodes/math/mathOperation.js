import { NodeDefinition } from '../../core/registry';
import MathOperationSettings from './MathOperationSettings';

/**
 * Определение ноды math:operation
 * Математические и сравнительные операции
 */
export const mathOperationDefinition = new NodeDefinition({
  type: 'math:operation',
  category: 'math',
  label: 'Математическая операция',
  description: 'Математические операции и сравнения',



  SettingsComponent: MathOperationSettings,

  defaultData: {
    operation: '+',
    a: 0,
    b: 0,
  },

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default mathOperationDefinition;
