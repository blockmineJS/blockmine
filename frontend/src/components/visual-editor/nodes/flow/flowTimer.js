import { NodeDefinition } from '../../core/registry';

export const flowTimerDefinition = new NodeDefinition({
  type: 'flow:timer',
  category: 'flow',
  label: 'Таймер',
  description: 'Выполняет тело цикла каждые N секунд. Можно прервать через Break',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
    { id: 'interval', name: 'Интервал (сек)', type: 'Number', required: false, inlineField: true, placeholder: '1' },
    { id: 'max_ticks', name: 'Макс. тиков (0 = ∞)', type: 'Number', required: false, inlineField: true, placeholder: '0' },
  ],

  computeOutputs: (data) => [
    { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
    { id: 'tick', name: 'Тик', type: 'Number' },
    { id: 'completed', name: 'Завершено', type: 'Exec' },
  ],

  defaultData: { interval: 1, max_ticks: 0 },

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default flowTimerDefinition;
