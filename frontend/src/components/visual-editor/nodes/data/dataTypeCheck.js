import { NodeDefinition } from '../../core/registry';
import DataTypeCheckSettings from './DataTypeCheckSettings';

/**
 * Определение ноды data:type_check
 * Проверяет тип значения
 */
export const dataTypeCheckDefinition = new NodeDefinition({
  type: 'data:type_check',
  category: 'data',
  label: 'Проверить тип',
  description: 'Проверяет соответствие значения типу',

  computeInputs: (data) => [
    { id: 'value', name: 'Value', type: 'Wildcard', description: 'Значение для проверки' },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Is Type', type: 'Boolean', description: 'True если тип совпадает' },
  ],

  SettingsComponent: DataTypeCheckSettings,

  defaultData: {
    checkType: 'string',
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataTypeCheckDefinition;
