import { NodeDefinition } from '../../core/registry';

export const dataStoreWriteDefinition = new NodeDefinition({
  type: 'data:store_write',
  category: 'data',
  label: 'Записать в Store',
  description: 'Сохраняет значение в хранилище плагина по ключу',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
    { id: 'plugin_name', name: 'Плагин', type: 'String', required: true, inlineField: true, placeholder: 'my-plugin' },
    { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'myKey' },
    { id: 'value', name: 'Значение', type: 'Wildcard', required: true },
  ],

  computeOutputs: () => [
    { id: 'exec', name: 'Далее', type: 'Exec' },
  ],

  defaultData: { plugin_name: '', key: '' },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataStoreWriteDefinition;
