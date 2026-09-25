import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:put_input
 * Кладёт предмет в слот плавки печки
 */
export const furnacePutInputDefinition = new NodeDefinition({
  type: 'furnace:put_input',
  category: 'furnace',
  label: 'Печка: положить для плавки',
  description: 'Кладёт предмет в слот плавки печки',



  defaultData: {
    itemName: '',
    count: null,
  },

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnacePutInputDefinition;
