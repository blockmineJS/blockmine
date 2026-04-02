import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:playerJoined
 * Срабатывает когда игрок заходит на сервер
 */
export const eventPlayerJoinedDefinition = new NodeDefinition({
  type: 'event:playerJoined',
  category: 'event',
  label: 'Игрок зашел',
  description: 'Срабатывает, когда игрок заходит на сервер',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'user', name: 'Пользователь', type: 'User' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventPlayerJoinedDefinition;
