import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:get_items
 * Получает список предметов из открытого контейнера
 */
export const containerGetItemsDefinition = new NodeDefinition({
  type: 'container:get_items',
  category: 'container',
  label: '📦 Контейнер: содержимое',
  description: 'Получает список предметов из открытого контейнера',

  computeInputs: (data) => [
    {
      id: 'container',
      name: 'Контейнер',
      type: 'Object',
      required: false,
      description: 'Объект контейнера (если не указан - текущий открытый)'
    },
  ],

  computeOutputs: (data) => [
    {
      id: 'items',
      name: 'Предметы',
      type: 'Array',
      description: 'Массив предметов в контейнере'
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
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerGetItemsDefinition;
