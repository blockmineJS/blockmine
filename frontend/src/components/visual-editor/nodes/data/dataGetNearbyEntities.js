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

  computeInputs: (data) => [
    {
      id: 'radius',
      name: 'Радиус',
      type: 'Number',
      description: 'Радиус поиска',
      required: false,
      inlineField: true,
      placeholder: '10'
    },
  ],

  computeOutputs: (data) => [
    { id: 'entities', name: 'Существа', type: 'Array', description: 'Массив существ' },
  ],

  defaultData: {
    radius: 10,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetNearbyEntitiesDefinition;
