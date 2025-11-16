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

  computeInputs: (data) => [
    { id: 'object', name: 'Объект', type: 'Object', description: 'Входной объект', required: true },
    {
      id: 'key',
      name: 'Ключ',
      type: 'String',
      description: 'Ключ для проверки',
      required: false,
      inlineField: true,
      placeholder: 'key'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Найден', type: 'Boolean', description: 'True если ключ существует' },
    { id: 'value', name: 'Значение', type: 'Wildcard', description: 'Значение по ключу' },
  ],

  defaultData: {
    key: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default objectHasKeyDefinition;
