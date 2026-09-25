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
