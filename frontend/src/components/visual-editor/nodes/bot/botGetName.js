import { NodeDefinition } from '../../core/registry';

export const botGetNameDefinition = new NodeDefinition({
  type: 'bot:get_name',
  category: 'bot',
  label: 'Имя бота',
  description: 'Возвращает имя (username) бота',

  computeInputs: () => [],

  computeOutputs: () => [
    { id: 'name', name: 'Имя', type: 'String' },
  ],

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default botGetNameDefinition;
