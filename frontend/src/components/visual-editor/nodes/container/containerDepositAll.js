import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды container:deposit_all
 * Кладёт все предметы указанного типа (или вообще все) в контейнер
 */
export const containerDepositAllDefinition = new NodeDefinition({
  type: 'container:deposit_all',
  category: 'container',
  label: '📦 Положить всё',
  description: 'Кладёт все предметы (или определённого типа) в контейнер',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    {
      id: 'itemName',
      name: 'Предмет',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Пусто = всё',
      description: 'Имя предмета (пусто = все предметы)'
    },
    {
      id: 'keepOne',
      name: 'Оставить 1',
      type: 'Boolean',
      required: false,
      inlineField: true,
      inlineFieldType: 'checkbox',
      description: 'Оставить хотя бы 1 предмет в инвентаре'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Готово', type: 'Exec' },
    {
      id: 'deposited',
      name: 'Положено',
      type: 'Number',
      description: 'Сколько предметов положено'
    },
  ],

  defaultData: {
    itemName: '',
    keepOne: false,
  },

  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default containerDepositAllDefinition;
