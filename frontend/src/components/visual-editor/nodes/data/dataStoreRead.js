import { NodeDefinition } from '../../core/registry';

export const dataStoreReadDefinition = new NodeDefinition({
  type: 'data:store_read',
  category: 'data',
  label: 'Прочитать из Store',
  description: 'Читает значение из хранилища плагина по ключу',

  computeInputs: (data) => [
    { id: 'plugin_name', name: 'Плагин', type: 'String', required: true, inlineField: true, placeholder: 'my-plugin' },
    { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'myKey' },
  ],

  computeOutputs: () => [
    { id: 'value', name: 'Значение', type: 'Wildcard' },
  ],

  defaultData: { plugin_name: '', key: '' },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataStoreReadDefinition;
