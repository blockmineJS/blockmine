import { NodeDefinition } from '../../core/registry';
import NavigationGoToSettings from './NavigationGoToSettings';

/**
 * Определение ноды navigation:go_to
 * Перемещает бота к указанным координатам
 */
export const navigationGoToDefinition = new NodeDefinition({
  type: 'navigation:go_to',
  category: 'navigation',
  label: '🚶 Идти к',
  description: 'Перемещает бота к указанным координатам используя pathfinding',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'x',
      name: 'X',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0',
      description: 'Координата X'
    },
    {
      id: 'y',
      name: 'Y',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '64',
      description: 'Координата Y'
    },
    {
      id: 'z',
      name: 'Z',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0',
      description: 'Координата Z'
    },
    {
      id: 'range',
      name: 'Радиус',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '1',
      description: 'На каком расстоянии остановиться (по умолчанию 1 блок)'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Дошёл', type: 'Exec' },
    { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если бот дошёл до точки'
    },
  ],

  SettingsComponent: NavigationGoToSettings,

  defaultData: {
    x: 0,
    y: 64,
    z: 0,
    range: 1,
  },

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationGoToDefinition;
