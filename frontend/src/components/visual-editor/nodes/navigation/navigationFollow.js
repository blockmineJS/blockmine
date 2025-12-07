import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды navigation:follow
 * Начинает следовать за игроком или сущностью
 */
export const navigationFollowDefinition = new NodeDefinition({
  type: 'navigation:follow',
  category: 'navigation',
  label: '👥 Следовать',
  description: 'Начинает следовать за игроком или сущностью',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'target',
      name: 'Цель',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'Имя игрока',
      description: 'Никнейм игрока за которым следовать'
    },
    {
      id: 'range',
      name: 'Дистанция',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '3',
      description: 'На каком расстоянии держаться'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Начал следовать', type: 'Exec' },
    {
      id: 'following',
      name: 'Следует?',
      type: 'Boolean',
      description: 'true если начал следовать'
    },
  ],

  defaultData: {
    target: '',
    range: 3,
  },

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationFollowDefinition;
