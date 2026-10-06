import { NodeDefinition } from '../../core/registry';

export const worldFindBlockDefinition = new NodeDefinition({
  type: 'world:find_block',
  category: 'world',
  label: 'Найти блок',
  description: 'Ищет блоки по имени в загруженных чанках',
  defaultData: {
    name: 'wheat',
    radius: 16,
    count: 1,
    minAge: null,
  },
  theme: {
    headerColor: '#0f766e',
    accentColor: '#14b8a6',
  },
});

export default worldFindBlockDefinition;
