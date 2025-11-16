import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды object:set
 * Добавляет или изменяет значение по ключу в объекте
 */
export const objectSetDefinition = new NodeDefinition({
  type: 'object:set',
  category: 'object',
  label: 'Установить значение',
  description: 'Добавляет или изменяет значение по ключу в объекте',

  computeInputs: (data) => [
    { id: 'object', name: 'Объект', type: 'Object', description: 'Входной объект', required: true },
    {
      id: 'key',
      name: 'Ключ',
      type: 'String',
      description: 'Ключ для установки',
      required: false,
      inlineField: true,
      placeholder: 'key'
    },
    {
      id: 'value',
      name: 'Значение',
      type: 'Wildcard',
      description: 'Значение для установки',
      required: false,
      inlineField: true,
      placeholder: '...'
    },
  ],

  computeOutputs: (data) => [
    { id: 'new_object', name: 'Новый объект', type: 'Object', description: 'Объект с новым значением' },
  ],

  defaultData: {
    key: '',
    value: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default objectSetDefinition;
