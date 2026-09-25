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



  defaultData: {
    format: 'yyyy-MM-dd HH:mm:ss',
  },

  theme: {
    headerColor: '#ec4899',
    accentColor: '#f472b6',
  },
});

export default timeFormatDefinition;
