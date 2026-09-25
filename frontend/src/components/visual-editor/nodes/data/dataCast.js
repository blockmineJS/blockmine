import { NodeDefinition } from '../../core/registry';
import DataCastSettings from './DataCastSettings';

/**
 * Определение ноды data:cast
 * Преобразует значение из одного типа в другой
 */
export const dataCastDefinition = new NodeDefinition({
  type: 'data:cast',
  category: 'data',
  label: 'Преобразовать тип',
  description: 'Преобразует значение в выбранный тип',



  SettingsComponent: DataCastSettings,

  defaultData: {
    targetType: 'String',
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataCastDefinition;
