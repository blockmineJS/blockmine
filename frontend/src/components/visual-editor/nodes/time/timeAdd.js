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



  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeAddDefinition;
