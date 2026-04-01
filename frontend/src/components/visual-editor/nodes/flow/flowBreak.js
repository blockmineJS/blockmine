import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды flow:break
 * Немедленно прерывает выполнение цикла
 */
export const flowBreakDefinition = new NodeDefinition({
  type: 'flow:break',
  category: 'flow',
  label: 'Выйти из цикла',
  description: 'Немедленно прерывает выполнение цикла (For Each Loop) и передает управление на его выход Completed',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
  ],

  computeOutputs: (data) => [],

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default flowBreakDefinition;
