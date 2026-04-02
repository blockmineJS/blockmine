import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды flow:while
 * Выполняет тело цикла пока условие истинно
 */
export const flowWhileDefinition = new NodeDefinition({
  type: 'flow:while',
  category: 'flow',
  label: 'Цикл While',
  description: 'Выполняет "Тело цикла" пока условие истинно',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
    { id: 'condition', name: 'Условие', type: 'Boolean', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
    { id: 'iteration', name: 'Итерация', type: 'Number' },
    { id: 'completed', name: 'Завершено', type: 'Exec' },
  ],

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default flowWhileDefinition;
