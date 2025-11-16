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

  computeInputs: (data) => [
    { id: 'object', name: 'Объект', type: 'Object', description: 'Входной объект', required: true },
    {
      id: 'key',
      name: 'Ключ',
      type: 'String',
      description: 'Ключ для получения',
      required: false,
      inlineField: true,
      placeholder: 'key'
    },
  ],

  computeOutputs: (data) => [
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

export default objectGetDefinition;
