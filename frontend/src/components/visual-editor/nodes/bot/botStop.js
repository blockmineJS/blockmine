import { NodeDefinition } from '../../core/registry';

export const botStopDefinition = new NodeDefinition({
  type: 'bot:stop',
  category: 'bot',
  label: 'Выключить бота',
  description: 'Останавливает бота',



  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default botStopDefinition;
