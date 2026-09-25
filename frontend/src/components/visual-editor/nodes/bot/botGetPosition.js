import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды bot:get_position
 * Возвращает текущую позицию бота в мире
 */
export const botGetPositionDefinition = new NodeDefinition({
  type: 'bot:get_position',
  category: 'bot',
  label: 'Получить позицию',
  description: 'Возвращает текущую позицию бота в мире',



  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default botGetPositionDefinition;
