import { NodeDefinition } from '../../core/registry';

export const worldAttackDefinition = new NodeDefinition({
  type: 'world:attack',
  category: 'world',
  label: 'Ударить',
  description: 'Один удар по сущности',
  defaultData: {},
  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default worldAttackDefinition;
