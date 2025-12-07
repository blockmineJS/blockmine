import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды inventory:get_all
 * Возвращает весь инвентарь бота как массив слотов
 */
export const inventoryGetAllDefinition = new NodeDefinition({
  type: 'inventory:get_all',
  category: 'inventory',
  label: '📦 Весь инвентарь',
  description: 'Возвращает весь инвентарь бота как массив предметов',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    {
      id: 'items',
      name: 'Предметы',
      type: 'Array',
      description: 'Массив предметов в инвентаре'
    },
    {
      id: 'count',
      name: 'Кол-во слотов',
      type: 'Number',
      description: 'Количество занятых слотов'
    },
  ],

  defaultData: {},

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default inventoryGetAllDefinition;
