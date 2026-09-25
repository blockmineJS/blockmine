import { NodeDefinition } from '../../core/registry';
import EventCallSettings from './EventCallSettings';

export const eventCallEventDefinition = new NodeDefinition({
  type: 'event:call_event',
  category: 'flow',
  label: 'Вызвать событие',
  description: 'Вызывает пользовательское событие и передаёт параметры',



  SettingsComponent: EventCallSettings,

  defaultData: { selectedEventId: null },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventCallEventDefinition;
