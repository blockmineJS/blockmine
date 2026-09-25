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
