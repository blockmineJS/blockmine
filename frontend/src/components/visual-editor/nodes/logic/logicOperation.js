import { NodeDefinition } from '../../core/registry';
import LogicOperationSettings from './LogicOperationSettings';

/**
 * Определение ноды logic:operation
 * Логические операции (AND, OR, NOT)
 */
export const logicOperationDefinition = new NodeDefinition({
  type: 'logic:operation',
  category: 'logic',
  label: 'Логическая операция',
  description: 'Логические операции',

  computeInputs: (data) => {
    const inputs = [];
    const operation = data.operation || 'AND';

    if (operation === 'NOT') {
      inputs.push({
        id: 'a',
        name: 'A',
        type: 'Boolean',
        required: false,
        inlineField: true,
        placeholder: 'true/false'
      });
    } else {
      const pinCount = data.pinCount || 2;
      for (let i = 0; i < pinCount; i++) {
        inputs.push({
          id: `pin_${i}`,
          name: String.fromCharCode(65 + i), // A, B, C...
          type: 'Boolean',
          required: false,
          inlineField: true,
          placeholder: 'true/false'
        });
      }
    }

    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean', description: 'Результат логической операции' },
  ],

  SettingsComponent: LogicOperationSettings,

  defaultData: {
    operation: 'AND',
    pinCount: 2,
  },

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default logicOperationDefinition;
