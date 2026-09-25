import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:entity_info
 * Извлекает данные из объекта существа
 */
export const dataEntityInfoDefinition = new NodeDefinition({
  type: 'data:entity_info',
  category: 'data',
  label: 'Информация о сущности',
  description: 'Информация о существе',



  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataEntityInfoDefinition;
