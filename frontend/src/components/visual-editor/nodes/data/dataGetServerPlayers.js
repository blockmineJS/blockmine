import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_server_players
 * Возвращает массив с именами всех игроков на сервере
 */
export const dataGetServerPlayersDefinition = new NodeDefinition({
  type: 'data:get_server_players',
  category: 'data',
  label: 'Игроки на сервере',
  description: 'Список всех игроков на сервере',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'players', name: 'Игроки', type: 'Array', description: 'Массив имен игроков' },
  ],

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetServerPlayersDefinition;
