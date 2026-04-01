import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:get_status
 * Получает текущий статус печки (топливо, прогресс, предметы)
 */
export const furnaceGetStatusDefinition = new NodeDefinition({
  type: 'furnace:get_status',
  category: 'furnace',
  label: 'Печка: статус',
  description: 'Получает текущий статус печки (топливо, прогресс, предметы в слотах)',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    {
      id: 'inputItem',
      name: 'Плавится',
      type: 'Object',
      description: 'Предмет в слоте плавки'
    },
    {
      id: 'fuelItem',
      name: 'Топливо',
      type: 'Object',
      description: 'Предмет в слоте топлива'
    },
    {
      id: 'outputItem',
      name: 'Результат',
      type: 'Object',
      description: 'Готовый предмет'
    },
    {
      id: 'fuel',
      name: 'Топливо %',
      type: 'Number',
      description: 'Оставшееся топливо (0-1)'
    },
    {
      id: 'progress',
      name: 'Прогресс %',
      type: 'Number',
      description: 'Прогресс плавки (0-1)'
    },
    {
      id: 'isBurning',
      name: 'Горит?',
      type: 'Boolean',
      description: 'true если печка работает'
    },
  ],

  defaultData: {},

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnaceGetStatusDefinition;
