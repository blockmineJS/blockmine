import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:close
 * Закрывает открытую печку
 */
export const furnaceCloseDefinition = new NodeDefinition({
  type: 'furnace:close',
  category: 'furnace',
  label: '🔥 Печка: закрыть',
  description: 'Закрывает открытую печку',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Далее', type: 'Exec' },
  ],

  defaultData: {},

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnaceCloseDefinition;
