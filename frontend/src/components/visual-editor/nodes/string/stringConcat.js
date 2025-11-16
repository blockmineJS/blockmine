import { NodeDefinition } from '../../core/registry';
import StringConcatSettings from './StringConcatSettings';

/**
 * Определение ноды string:concat
 * Объединение строк
 */
export const stringConcatDefinition = new NodeDefinition({
  type: 'string:concat',
  category: 'string',
  label: 'Объединить строки',
  description: 'Объединяет несколько строк в одну',

  computeInputs: (data) => {
    const inputs = [];
    const pinCount = data.pinCount || 2;
    for (let i = 0; i < pinCount; i++) {
      inputs.push({
        id: `pin_${i}`,
        name: `Строка ${i}`,
        type: 'String',
        required: false,
        inlineField: true,
        placeholder: '...'
      });
    }
    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'String' },
  ],

  SettingsComponent: StringConcatSettings,

  defaultData: {
    pinCount: 2,
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringConcatDefinition;
