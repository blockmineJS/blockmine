import { NodeDefinition } from '../../core/registry';
import EventCustomSettings from './EventCustomSettings';

export const eventCustomEventDefinition = new NodeDefinition({
  type: 'event:custom_event',
  category: 'event',
  label: '▶️ Событие',
  description: 'Стартовая нода пользовательского события с динамическими параметрами',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    ...(data.pins || []).map((pin) => ({ id: pin.id, name: pin.name, type: pin.type })),
  ],

  SettingsComponent: EventCustomSettings,

  defaultData: { pins: [] },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventCustomEventDefinition;
