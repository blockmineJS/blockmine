import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_nearby_entities
 * Возвращает массив существ в радиусе от бота
 */
export const dataGetNearbyEntitiesDefinition = new NodeDefinition({
  type: 'data:get_nearby_entities',
  category: 'data',
  label: 'Сущности рядом',
  description: 'Существа в радиусе от бота',



  defaultData: {
    radius: 10,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetNearbyEntitiesDefinition;
