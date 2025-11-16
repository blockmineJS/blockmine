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

  computeInputs: (data) => [
    { id: 'date', name: 'Дата (строка)', type: 'String', description: 'ISO строка даты', required: false },
  ],

  computeOutputs: (data) => [
    { id: 'value', name: 'Дата', type: 'DateTime', description: 'Объект даты и времени' },
  ],

  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeDateTimeLiteralDefinition;
