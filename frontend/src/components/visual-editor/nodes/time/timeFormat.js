import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды time:format
 * Форматирует дату в строку
 */
export const timeFormatDefinition = new NodeDefinition({
  type: 'time:format',
  category: 'time',
  label: 'Форматировать дату',
  description: 'Форматирует дату в строку (yyyy-MM-dd HH:mm:ss)',

  computeInputs: (data) => [
    { id: 'date', name: 'Дата', type: 'DateTime', description: 'Дата для форматирования', required: true },
    {
      id: 'format',
      name: 'Формат',
      type: 'String',
      description: 'Строка формата',
      required: false,
      inlineField: true,
      placeholder: 'yyyy-MM-dd HH:mm:ss'
    },
  ],

  computeOutputs: (data) => [
    { id: 'formatted', name: 'Строка', type: 'String', description: 'Отформатированная дата' },
  ],

  defaultData: {
    format: 'yyyy-MM-dd HH:mm:ss',
  },

  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeFormatDefinition;
