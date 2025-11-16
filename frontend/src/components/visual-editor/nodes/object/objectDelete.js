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

  computeInputs: (data) => [
    { id: 'object', name: 'Объект', type: 'Object', description: 'Входной объект', required: true },
    {
      id: 'key',
      name: 'Ключ',
      type: 'String',
      description: 'Ключ для удаления',
      required: false,
      inlineField: true,
      placeholder: 'key'
    },
  ],

  computeOutputs: (data) => [
    { id: 'new_object', name: 'Новый объект', type: 'Object', description: 'Объект без ключа' },
  ],

  defaultData: {
    key: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default objectDeleteDefinition;
