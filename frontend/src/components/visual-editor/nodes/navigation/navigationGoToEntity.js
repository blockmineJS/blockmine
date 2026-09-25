import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды navigation:go_to_entity
 * Перемещает бота к указанной сущности
 */
export const navigationGoToEntityDefinition = new NodeDefinition({
  type: 'navigation:go_to_entity',
  category: 'navigation',
  label: 'Идти к сущности',
  description: 'Перемещает бота к указанной сущности (моб, животное)',



  defaultData: {
    range: 2,
  },

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationGoToEntityDefinition;
