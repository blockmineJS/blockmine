import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды flow:delay
 * Ожидает указанное количество миллисекунд
 */
export const flowDelayDefinition = new NodeDefinition({
  type: 'flow:delay',
  category: 'flow',
  label: '⏱️ Задержка',
  description: 'Ожидает указанное количество миллисекунд, затем продолжает выполнение',



  defaultData: {
    delay: 1000,
  },

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default flowDelayDefinition;
