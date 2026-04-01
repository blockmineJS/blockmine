import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды navigation:go_to_player
 * Перемещает бота к указанному игроку
 */
export const navigationGoToPlayerDefinition = new NodeDefinition({
  type: 'navigation:go_to_player',
  category: 'navigation',
  label: 'Идти к игроку',
  description: 'Перемещает бота к указанному игроку',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'playerName',
      name: 'Имя игрока',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'Steve',
      description: 'Никнейм игрока'
    },
    {
      id: 'range',
      name: 'Радиус',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '2',
      description: 'На каком расстоянии остановиться'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Дошёл', type: 'Exec' },
    { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если бот дошёл до игрока'
    },
    {
      id: 'playerPosition',
      name: 'Позиция игрока',
      type: 'Object',
      description: 'Координаты игрока {x, y, z}'
    },
  ],

  defaultData: {
    playerName: '',
    range: 2,
  },

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationGoToPlayerDefinition;
