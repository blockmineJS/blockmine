import { NodeDefinition } from '../../core/registry';
import FlowBranchSettings from './FlowBranchSettings';

/**
 * Определение ноды flow:branch
 * Условное ветвление выполнения
 */
export const flowBranchDefinition = new NodeDefinition({
  type: 'flow:branch',
  category: 'flow',
  label: 'Ветвление',
  description: 'Условное ветвление на основе boolean значения',

  computeInputs: (data) => {
    let inputs = [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
    ];

    if (data.advanced) {
      // Расширенный режим - логические операторы
      const conditionIndex = inputs.findIndex(p => p.id === 'condition');
      if (conditionIndex !== -1) {
        inputs.splice(conditionIndex, 1);
      }

      for (let i = 0; i < (data.pinCount || 2); i++) {
        inputs.push({
          id: `pin_${i}`,
          name: String.fromCharCode(65 + i), // A, B, C...
          type: 'Boolean',
        });
      }
    } else {
      // Простой режим - один condition пин
      if (!inputs.find(p => p.id === 'condition')) {
        inputs.push({ id: 'condition', name: 'Condition', type: 'Boolean', required: true });
      }
      return inputs.filter(p => p.id === 'condition' || p.type === 'Exec');
    }

    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'exec_true', name: 'True', type: 'Exec', description: 'Выполняется если условие true' },
    { id: 'exec_false', name: 'False', type: 'Exec', description: 'Выполняется если условие false' },
  ],

  SettingsComponent: FlowBranchSettings,

  defaultData: {
    advanced: false,
    operator: 'AND',
    pinCount: 2,
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default flowBranchDefinition;
