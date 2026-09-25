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
