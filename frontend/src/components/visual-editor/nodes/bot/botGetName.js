import { NodeDefinition } from '../../core/registry';

export const botGetNameDefinition = new NodeDefinition({
  type: 'bot:get_name',
  category: 'bot',
  label: 'Имя бота',
  description: 'Возвращает имя (username) бота',



  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default botGetNameDefinition;
