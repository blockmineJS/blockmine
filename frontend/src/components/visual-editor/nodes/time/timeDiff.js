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



  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeDiffDefinition;
