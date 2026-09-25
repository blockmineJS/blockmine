import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:put_fuel
 * Кладёт топливо в слот топлива печки
 */
export const furnacePutFuelDefinition = new NodeDefinition({
  type: 'furnace:put_fuel',
  category: 'furnace',
  label: 'Печка: положить топливо',
  description: 'Кладёт топливо в слот топлива печки',



  defaultData: {
    itemName: '',
    count: null,
  },

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnacePutFuelDefinition;
