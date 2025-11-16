import { NodeDefinition } from '../../core/registry';
import FlowSequenceSettings from './FlowSequenceSettings';

/**
 * Определение ноды flow:sequence
 * Последовательное выполнение нескольких веток
 */
export const flowSequenceDefinition = new NodeDefinition({
  type: 'flow:sequence',
  category: 'flow',
  label: 'Последовательность',
  description: 'Последовательно выполняет несколько веток',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  computeOutputs: (data) => {
    const pinCount = data.pinCount || 2;
    const outputs = [];
    for (let i = 0; i < pinCount; i++) {
      outputs.push({
        id: `exec_${i}`,
        name: `${i}`,
        type: 'Exec',
      });
    }
    return outputs;
  },

  SettingsComponent: FlowSequenceSettings,

  defaultData: {
    pinCount: 2,
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default flowSequenceDefinition;
