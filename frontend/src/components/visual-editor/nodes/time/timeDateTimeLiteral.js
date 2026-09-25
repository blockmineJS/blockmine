import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды time:datetime_literal
 * Создает объект даты и времени из строки
 */
export const timeDateTimeLiteralDefinition = new NodeDefinition({
  type: 'time:datetime_literal',
  category: 'time',
  label: 'Дата и время',
  description: 'Создает объект даты и времени. Пусто = текущее время',



  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeDateTimeLiteralDefinition;
