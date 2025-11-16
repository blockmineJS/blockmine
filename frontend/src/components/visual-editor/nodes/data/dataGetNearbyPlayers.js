import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_nearby_players
 * Возвращает массив игроков с расстоянием
 */
export const dataGetNearbyPlayersDefinition = new NodeDefinition({
  type: 'data:get_nearby_players',
  category: 'data',
  label: 'Игроки рядом',
  description: 'Игроки рядом с ботом',

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
    { id: 'players', name: 'Игроки', type: 'Array', description: 'Массив игроков с расстоянием' },
  ],

  defaultData: {
    radius: 10,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetNearbyPlayersDefinition;
