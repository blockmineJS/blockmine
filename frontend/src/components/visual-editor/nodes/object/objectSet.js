import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды object:set
 * Добавляет или изменяет значение по ключу в объекте
 */
export const objectSetDefinition = new NodeDefinition({
  type: 'object:set',
  category: 'object',
  label: 'Установить значение',
  description: 'Добавляет или изменяет значение по ключу в объекте',



  defaultData: {
    key: '',
    value: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default objectSetDefinition;
