import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:get_status
 * Получает текущий статус печки (топливо, прогресс, предметы)
 */
export const furnaceGetStatusDefinition = new NodeDefinition({
  type: 'furnace:get_status',
  category: 'furnace',
  label: 'Печка: статус',
  description: 'Получает текущий статус печки (топливо, прогресс, предметы в слотах)',



  defaultData: {},

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnaceGetStatusDefinition;
