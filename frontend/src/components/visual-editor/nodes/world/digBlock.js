import { NodeDefinition } from '../../core/registry';

export const worldDigDefinition = new NodeDefinition({
  type: 'world:dig',
  category: 'world',
  label: 'Сломать блок',
  description: 'Ломает блок по объекту или координатам',
  defaultData: {
    x: null,
    y: null,
    z: null,
  },
  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default worldDigDefinition;
