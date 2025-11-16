import { NodeDefinition } from '../../core/registry';
import DataMakeObjectSettings from './DataMakeObjectSettings';

/**
 * Определение ноды data:make_object
 * Создание объекта из пар ключ-значение (упрощенная версия)
 */
export const dataMakeObjectDefinition = new NodeDefinition({
  type: 'data:make_object',
  category: 'data',
  label: 'Создать объект',
  description: 'Создает объект из пар ключ-значение',

  computeInputs: (data) => {
    const inputs = [];
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
    return inputs;
  },

  computeOutputs: (data) => [
    { id: 'object', name: 'Object', type: 'Object', description: 'Созданный объект' },
  ],

  SettingsComponent: DataMakeObjectSettings,

  defaultData: {
    pinCount: 0,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataMakeObjectDefinition;
