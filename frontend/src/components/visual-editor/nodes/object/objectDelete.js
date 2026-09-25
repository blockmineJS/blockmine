import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды object:delete
 * Удаляет ключ из объекта
 */
export const objectDeleteDefinition = new NodeDefinition({
  type: 'object:delete',
  category: 'object',
  label: 'Удалить ключ',
  description: 'Удаляет ключ из объекта',



  defaultData: {
    key: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default objectDeleteDefinition;
