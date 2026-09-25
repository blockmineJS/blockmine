import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:withdraw
 * Забирает предмет из открытого контейнера
 */
export const containerWithdrawDefinition = new NodeDefinition({
  type: 'container:withdraw',
  category: 'container',
  label: 'Контейнер: забрать',
  description: 'Забирает предмет из контейнера в инвентарь',



  defaultData: {
    itemName: '',
    count: null,
  },

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerWithdrawDefinition;
