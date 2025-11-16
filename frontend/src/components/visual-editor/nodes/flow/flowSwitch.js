import { NodeDefinition } from '../../core/registry';
import FlowSwitchSettings from './FlowSwitchSettings';

/**
 * Определение ноды flow:switch
 * Множественное ветвление на основе значения
 */
export const flowSwitchDefinition = new NodeDefinition({
  type: 'flow:switch',
  category: 'flow',
  label: 'Переключатель',
  description: 'Выбирает ветку выполнения на основе значения',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'value',
      name: 'Value',
      type: 'Wildcard',
      description: 'Значение для сравнения',
      required: false,
      inlineField: true,
      placeholder: '...'
    },
  ],

  computeOutputs: (data) => {
    const caseCount = data.caseCount || 0;
    const outputs = [];

    for (let i = 0; i < caseCount; i++) {
      const caseValue = data[`case_${i}`] || '';
      const caseLabel = caseValue ? `Case: ${caseValue}` : `Case ${i}`;
      outputs.push({
        id: `case_${i}`,
        name: caseLabel,
        type: 'Exec',
      });
    }

    outputs.push({
      id: 'default',
      name: 'Default',
      type: 'Exec',
    });

    return outputs;
  },

  SettingsComponent: FlowSwitchSettings,

  defaultData: {
    caseCount: 0,
    value: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default flowSwitchDefinition;
