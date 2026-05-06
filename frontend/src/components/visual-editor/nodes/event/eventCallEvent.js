import { NodeDefinition } from '../../core/registry';
import EventCallSettings from './EventCallSettings';

export const eventCallEventDefinition = new NodeDefinition({
  type: 'event:call_event',
  category: 'flow',
  label: 'Вызвать событие',
  description: 'Вызывает пользовательское событие и передаёт параметры',

  computeInputs: (data, context) => {
    const pins = [{ id: 'exec', name: 'Выполнить', type: 'Exec' }];

    if (data.selectedEventId != null) {
      const selectedNode = (context.nodes || []).find(n => n.id === data.selectedEventId);

      if (selectedNode && selectedNode.type === 'event:custom_event') {
        (selectedNode.data.pins || [])
          .filter(pin => pin.type !== 'Exec')
          .forEach(pin => pins.push({ id: pin.id, name: pin.name, type: pin.type }));
      }
    }

    return pins;
  },

  computeOutputs: () => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  SettingsComponent: EventCallSettings,

  defaultData: { selectedEventId: null },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventCallEventDefinition;
