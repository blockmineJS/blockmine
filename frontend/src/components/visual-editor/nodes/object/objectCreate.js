import { NodeDefinition } from '../../core/registry';
import ObjectCreateSettings from './ObjectCreateSettings';

/**
 * Определение ноды object:create
 * Создание объекта из пар ключ-значение
 */
export const objectCreateDefinition = new NodeDefinition({
  type: 'object:create',
  category: 'object',
  label: 'Создать объект',
  description: 'Создает объект из пар ключ-значение',

  computeInputs: (data) => {
    const inputs = [];

    if (!data.advanced) {
      for (let i = 0; i < (data.pinCount || 0); i++) {
        inputs.push({
          id: `key_${i}`,
          name: `Ключ ${i}`,
          type: 'String',
        });
        inputs.push({
          id: `value_${i}`,
          name: `Значение ${i}`,
          type: 'Wildcard',
        });
      }
    }

    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'object', name: 'Object', type: 'Object', description: 'Созданный объект' },
  ],

  SettingsComponent: ObjectCreateSettings,

  defaultData: {
    advanced: false,
    pinCount: 0,
    jsonValue: '{}',
  },

  theme: {
    headerColor: '#9333ea',
    accentColor: '#a855f7',
  },
});

export default objectCreateDefinition;
