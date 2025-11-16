import { NodeDefinition } from '../../core/registry';
import StringLiteralSettings from './StringLiteralSettings';

/**
 * Определение ноды data:string_literal
 * Строковый литерал с поддержкой переменных
 */
export const stringLiteralDefinition = new NodeDefinition({
  type: 'data:string_literal',
  category: 'string',
  label: 'Строка',
  description: 'Строка с поддержкой переменных {name}',

  computeInputs: (data) => {
    const inputs = [
      {
        id: 'value',
        name: 'Текст',
        type: 'String',
        required: false,
        inlineField: true,
        placeholder: 'Введите текст...'
      }
    ];

    const text = data.value || '';
    const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = [...text.matchAll(variablePattern)];
    const uniqueVars = [...new Set(matches.map(m => m[1]))];

    uniqueVars.forEach(varName => {
      inputs.push({
        id: `var_${varName}`,
        name: varName,
        type: 'Wildcard',
      });
    });

    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'value', name: 'Value', type: 'String', description: 'Итоговая строка' },
  ],

  SettingsComponent: StringLiteralSettings,

  defaultData: {
    value: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringLiteralDefinition;
