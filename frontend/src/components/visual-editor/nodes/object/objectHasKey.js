import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды object:has_key
 * Проверяет наличие ключа в объекте и возвращает значение
 */
export const objectHasKeyDefinition = new NodeDefinition({
  type: 'object:has_key',
  category: 'object',
  label: 'Есть ключ',
  description: 'Проверяет наличие ключа в объекте',



  defaultData: {
    key: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default objectHasKeyDefinition;
