import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды time:diff
 * Вычисляет разницу между двумя датами
 */
export const timeDiffDefinition = new NodeDefinition({
  type: 'time:diff',
  category: 'time',
  label: 'Разница времени',
  description: 'Разница между датами в миллисекундах',

  computeInputs: (data) => [
    { id: 'date_left', name: 'Дата А', type: 'DateTime', required: true },
    { id: 'date_right', name: 'Дата Б', type: 'DateTime', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'diff', name: 'Разница (мс)', type: 'Number', description: 'Разница в миллисекундах' },
  ],

  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeDiffDefinition;
