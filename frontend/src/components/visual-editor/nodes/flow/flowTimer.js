import { NodeDefinition } from '../../core/registry';

export const flowTimerDefinition = new NodeDefinition({
  type: 'flow:timer',
  category: 'flow',
  label: 'Таймер',
  description: 'Выполняет тело цикла каждые N секунд. Можно прервать через Break',



  defaultData: { interval: 1, max_ticks: 0 },

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default flowTimerDefinition;
