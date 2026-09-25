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
