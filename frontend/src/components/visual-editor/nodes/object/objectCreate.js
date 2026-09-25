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
