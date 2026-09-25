import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:deposit
 * Кладёт предмет в открытый контейнер
 */
export const containerDepositDefinition = new NodeDefinition({
  type: 'container:deposit',
  category: 'container',
  label: 'Контейнер: положить',
  description: 'Кладёт предмет из инвентаря в открытый контейнер',



  defaultData: {
    itemName: '',
    count: null,
  },

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerDepositDefinition;
