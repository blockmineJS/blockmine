import { NodeDefinition } from '../../core/registry';
import ArrayLiteralSettings from './ArrayLiteralSettings';

/**
 * Определение ноды data:array_literal
 * Создание массива из элементов
 */
export const arrayLiteralDefinition = new NodeDefinition({
  type: 'data:array_literal',
  category: 'array',
  label: 'Массив',
  description: 'Создает массив из элементов',

  computeInputs: (data) => {
    const inputs = [];
    for (let i = 0; i < (data.pinCount || 0); i++) {
      inputs.push({
        id: `item_${i}`,
        name: `[${i}]`,
        type: 'Wildcard',
      });
    }
    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'array', name: 'Array', type: 'Array', description: 'Созданный массив' },
  ],

  SettingsComponent: ArrayLiteralSettings,

  defaultData: {
    pinCount: 0,
  },

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default arrayLiteralDefinition;
