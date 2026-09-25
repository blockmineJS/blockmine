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
