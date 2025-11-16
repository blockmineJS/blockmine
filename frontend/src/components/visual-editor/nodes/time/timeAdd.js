import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды time:add
 * Добавляет к дате указанный промежуток времени
 */
export const timeAddDefinition = new NodeDefinition({
  type: 'time:add',
  category: 'time',
  label: 'Добавить время',
  description: 'Добавляет к дате промежуток времени',

  computeInputs: (data) => [
    { id: 'date', name: 'Дата', type: 'DateTime', required: true },
    { id: 'duration', name: 'Продолжительность', type: 'Object', description: '{ seconds: 5, minutes: 1 }', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Новая дата', type: 'DateTime', description: 'Дата с добавленным временем' },
  ],

  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeAddDefinition;
