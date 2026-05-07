import { NodeDefinition } from '../../core/registry';

export const arrayShuffleDefinition = new NodeDefinition({
  type: 'array:shuffle',
  category: 'array',
  label: 'Перемешать массив',
  description: 'Возвращает новый массив с элементами в случайном порядке',

  computeInputs: () => [
    { id: 'array', name: 'Массив', type: 'Array', required: true },
  ],

  computeOutputs: () => [
    { id: 'shuffled', name: 'Перемешанный', type: 'Array' },
  ],

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayShuffleDefinition;
