import { NodeDefinition } from '../../core/registry';
import FurnaceOpenSettings from './FurnaceOpenSettings';

/**
 * Определение ноды furnace:open
 * Открывает печку по координатам
 */
export const furnaceOpenDefinition = new NodeDefinition({
  type: 'furnace:open',
  category: 'furnace',
  label: 'Печка: открыть',
  description: 'Открывает печку (обычную, плавильную, коптильню) по координатам',



  SettingsComponent: FurnaceOpenSettings,

  defaultData: {
    x: 0,
    y: 64,
    z: 0,
  },

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnaceOpenDefinition;
