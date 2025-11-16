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

  computeInputs: (data) => [
    {
      id: 'a',
      name: 'A',
      type: 'Number',
      description: 'Первое число',
      required: false,
      inlineField: true,
      placeholder: '0'
    },
    {
      id: 'b',
      name: 'B',
      type: 'Number',
      description: 'Второе число',
      required: false,
      inlineField: true,
      placeholder: '0'
    },
  ],

  computeOutputs: (data) => {
    const operation = data.operation || '+';
    const isComparison = ['>', '<', '==', '>=', '<=', '!='].includes(operation);

    return [
      {
        id: 'result',
        name: 'Result',
        type: isComparison ? 'Boolean' : 'Number',
        description: 'Результат операции',
      },
    ];
  },

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
