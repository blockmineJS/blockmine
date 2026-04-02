import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:find_item
 * Ищет предмет в открытом контейнере
 */
export const containerFindItemDefinition = new NodeDefinition({
  type: 'container:find_item',
  category: 'container',
  label: 'Контейнер: найти предмет',
  description: 'Ищет предмет в открытом контейнере',

  computeInputs: (data) => [
    {
      id: 'itemName',
      name: 'Предмет',
      type: 'String',
      required: true,
      inlineField: true,
      placeholder: 'diamond, iron_ingot...',
      description: 'Имя искомого предмета'
    },
  ],

  computeOutputs: (data) => [
    {
      id: 'item',
      name: 'Предмет',
      type: 'Object',
      description: 'Найденный предмет или null'
    },
    {
      id: 'slot',
      name: 'Слот',
      type: 'Number',
      description: 'Номер слота (-1 если не найден)'
    },
    {
      id: 'count',
      name: 'Кол-во',
      type: 'Number',
      description: 'Общее количество в контейнере'
    },
    {
      id: 'found',
      name: 'Найден?',
      type: 'Boolean',
      description: 'true если предмет найден'
    },
  ],

  defaultData: {
    itemName: '',
  },

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerFindItemDefinition;
