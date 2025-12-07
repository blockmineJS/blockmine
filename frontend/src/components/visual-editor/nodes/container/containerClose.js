import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:close
 * Закрывает открытый контейнер
 */
export const containerCloseDefinition = new NodeDefinition({
  type: 'container:close',
  category: 'container',
  label: '📦 Контейнер: закрыть',
  description: 'Закрывает текущий открытый контейнер',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Закрыт', type: 'Exec' },
  ],

  defaultData: {},

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerCloseDefinition;
