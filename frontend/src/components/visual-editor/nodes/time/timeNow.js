import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды time:now
 * Возвращает текущую дату и время
 */
export const timeNowDefinition = new NodeDefinition({
  type: 'time:now',
  category: 'time',
  label: 'Сейчас',
  description: 'Возвращает текущую дату и время',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'now', name: 'Сейчас', type: 'DateTime' },
  ],

  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeNowDefinition;
