import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды object:get
 * Получает значение по ключу из объекта
 */
export const objectGetDefinition = new NodeDefinition({
  type: 'object:get',
  category: 'object',
  label: 'Получить значение',
  description: 'Получает значение по ключу из объекта',



  defaultData: {
    key: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default objectGetDefinition;
