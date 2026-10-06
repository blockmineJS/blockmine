import { NodeDefinition } from '../../core/registry';

export const navigationStepDefinition = new NodeDefinition({
  type: 'navigation:step',
  category: 'navigation',
  label: 'Шаг',
  description: 'Идёт вперёд, назад, влево или вправо относительно взгляда бота',
  defaultData: {
    direction: 'forward',
    distance: 1,
  },
  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default navigationStepDefinition;
