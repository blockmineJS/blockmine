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



  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetServerPlayersDefinition;
