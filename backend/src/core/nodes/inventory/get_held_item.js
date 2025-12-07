/**
 * inventory:get_held_item - Получить предмет в руке бота
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const hand = (await helpers.resolvePinValue(node, 'hand')) || 'main';

  if (!bot?.inventory) {
    if (pinId === 'item') return null;
    if (pinId === 'name') return '';
    if (pinId === 'count') return 0;
    if (pinId === 'hasItem') return false;
    return null;
  }

  // Получаем предмет в руке
  let item;
  if (hand === 'off') {
    // Офхенд слот (40 в Java Edition)
    item = bot.inventory.slots[45]; // offhand slot
  } else {
    // Основная рука - текущий выбранный слот хотбара
    item = bot.heldItem;
  }

  if (pinId === 'item') {
    if (!item) return null;

    // Извлекаем прочность из NBT
    const damage = item.nbt?.value?.Damage?.value ?? 0;
    const maxDurability = item.maxDurability ?? null;
    const durability = maxDurability ? maxDurability - damage : null;

    return {
      name: item.name,
      displayName: item.displayName,
      count: item.count,
      slot: item.slot,
      type: item.type,
      metadata: item.metadata,
      nbt: item.nbt,
      durability,        // Оставшаяся прочность
      maxDurability,     // Максимальная прочность
      damage             // Использованная прочность
    };
  }

  if (pinId === 'name') {
    return item?.name || '';
  }

  if (pinId === 'count') {
    return item?.count || 0;
  }

  if (pinId === 'hasItem') {
    return !!item;
  }

  return null;
}

module.exports = { evaluate };
