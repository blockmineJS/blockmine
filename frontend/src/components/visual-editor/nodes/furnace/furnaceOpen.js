import { NodeDefinition } from '../../core/registry';
import FurnaceOpenSettings from './FurnaceOpenSettings';

/**
 * Определение ноды furnace:open
 * Открывает печку по координатам
 */
export const furnaceOpenDefinition = new NodeDefinition({
  type: 'furnace:open',
  category: 'furnace',
  label: '🔥 Печка: открыть',
  description: 'Открывает печку (обычную, плавильную, коптильню) по координатам',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'x',
      name: 'X',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0',
      description: 'Координата X печки'
    },
    {
      id: 'y',
      name: 'Y',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '64',
      description: 'Координата Y печки'
    },
    {
      id: 'z',
      name: 'Z',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0',
      description: 'Координата Z печки'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Открыта', type: 'Exec' },
    { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
    {
      id: 'furnace',
      name: 'Печка',
      type: 'Object',
      description: 'Объект открытой печки'
    },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если печка открыта'
    },
  ],

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
