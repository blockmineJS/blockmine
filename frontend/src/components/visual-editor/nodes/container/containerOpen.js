import { NodeDefinition } from '../../core/registry';
import ContainerOpenSettings from './ContainerOpenSettings';

/**
 * Определение ноды container:open
 * Открывает контейнер (сундук, бочку и т.д.) по координатам
 */
export const containerOpenDefinition = new NodeDefinition({
  type: 'container:open',
  category: 'container',
  label: 'Контейнер: открыть',
  description: 'Открывает контейнер (сундук, бочку) по координатам',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'x',
      name: 'X',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0',
      description: 'Координата X контейнера'
    },
    {
      id: 'y',
      name: 'Y',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '64',
      description: 'Координата Y контейнера'
    },
    {
      id: 'z',
      name: 'Z',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0',
      description: 'Координата Z контейнера'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Открыт', type: 'Exec' },
    { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
    {
      id: 'container',
      name: 'Контейнер',
      type: 'Object',
      description: 'Объект открытого контейнера'
    },
    {
      id: 'success',
      name: 'Успех?',
      type: 'Boolean',
      description: 'true если контейнер открыт'
    },
  ],

  SettingsComponent: ContainerOpenSettings,

  defaultData: {
    x: 0,
    y: 64,
    z: 0,
  },

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerOpenDefinition;
