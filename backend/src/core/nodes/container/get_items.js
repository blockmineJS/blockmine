/**
 * container:get_items - Получить содержимое контейнера
 *
 * Data нода (без exec пинов) - использует только evaluator.
 */
async function evaluate(node, pinId, context, helpers) {
  const { resolvePinValue } = helpers;
  const container = (await resolvePinValue(node, 'container', null)) || context.openContainer;

  if (!container) {
    if (pinId === 'items') return [];
    if (pinId === 'count') return 0;
    return null;
  }

  try {
    const items = container.containerItems ? container.containerItems() : [];

    const nonEmptyItems = items.filter(item => item !== null);

    if (pinId === 'items') {
      return nonEmptyItems.map(item => {
        const damage = item.nbt?.value?.Damage?.value ?? 0;
        const maxDurability = item.maxDurability ?? null;
        const durability = maxDurability ? maxDurability - damage : null;

        return {
          name: item.name,
          displayName: item.displayName,
          count: item.count,
          slot: item.slot,
          stackSize: item.stackSize,
          durability,
          maxDurability,
          damage
        };
      });
    }

    if (pinId === 'count') {
      return nonEmptyItems.length;
    }
  } catch (error) {
    if (pinId === 'items') return [];
    if (pinId === 'count') return 0;
  }

  return null;
}

module.exports = { evaluate };
