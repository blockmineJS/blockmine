import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:length
 * Возвращает длину строки
 */
export const stringLengthDefinition = new NodeDefinition({
  type: 'string:length',
  category: 'string',
  label: 'Длина',
  description: 'Возвращает длину строки',



  defaultData: {
    text: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringLengthDefinition;
