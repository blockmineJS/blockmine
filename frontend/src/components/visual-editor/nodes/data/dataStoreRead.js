import { NodeDefinition } from '../../core/registry';

export const dataStoreReadDefinition = new NodeDefinition({
  type: 'data:store_read',
  category: 'data',
  label: 'Прочитать из Store',
  description: 'Читает значение из хранилища плагина по ключу',



  defaultData: { plugin_name: '', key: '' },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataStoreReadDefinition;
