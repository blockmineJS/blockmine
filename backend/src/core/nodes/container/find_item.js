/**
 * container:find_item - Найти предмет в контейнере
 *
 * Data нода (без exec пинов) - использует только evaluator.
 */
async function evaluate(node, pinId, context, helpers) {
  const { resolvePinValue } = helpers;
  const container = context.openContainer;
  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);

  if (!container || !itemName) {
    if (pinId === 'item') return null;
    if (pinId === 'slot') return -1;
    if (pinId === 'count') return 0;
    if (pinId === 'found') return false;
    return null;
  }

  try {
    const searchName = itemName.toLowerCase().replace('minecraft:', '');

    // Получаем предметы из контейнера
    const containerItems = container.containerItems ? container.containerItems() : [];

    // Ищем предмет
    let foundItem = null;
    let foundSlot = -1;
    let totalCount = 0;

    containerItems.forEach((item, index) => {
      if (!item) return;

      const matches = item.name.toLowerCase().includes(searchName) ||
                      item.displayName?.toLowerCase().includes(searchName);

      if (matches) {
        if (!foundItem) {
          foundItem = item;
          foundSlot = index;
        }
        totalCount += item.count;
      }
    });

    if (pinId === 'item') {
      if (!foundItem) return null;

      // Извлекаем прочность из NBT
      const damage = foundItem.nbt?.value?.Damage?.value ?? 0;
      const maxDurability = foundItem.maxDurability ?? null;
      const durability = maxDurability ? maxDurability - damage : null;

      return {
        name: foundItem.name,
        displayName: foundItem.displayName,
        count: foundItem.count,
        slot: foundSlot,
        durability,
        maxDurability,
        damage
      };
    }

    if (pinId === 'slot') return foundSlot;
    if (pinId === 'count') return totalCount;
    if (pinId === 'found') return foundItem !== null;
  } catch (error) {
    if (pinId === 'item') return null;
    if (pinId === 'slot') return -1;
    if (pinId === 'count') return 0;
    if (pinId === 'found') return false;
  }

  return null;
}

module.exports = { evaluate };
