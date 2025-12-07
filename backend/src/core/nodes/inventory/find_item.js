/**
 * inventory:find_item - Найти предмет в инвентаре по имени
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const itemName = await helpers.resolvePinValue(node, 'itemName');

  if (!bot?.inventory || !itemName) {
    if (pinId === 'item') return null;
    if (pinId === 'found') return false;
    if (pinId === 'slot') return -1;
    return null;
  }

  // Ищем предмет (поддержка частичного совпадения)
  const searchName = itemName.toLowerCase().replace('minecraft:', '');
  const item = bot.inventory.items().find(i =>
    i.name.toLowerCase().includes(searchName) ||
    i.displayName?.toLowerCase().includes(searchName)
  );

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

  if (pinId === 'found') {
    return !!item;
  }

  if (pinId === 'slot') {
    return item ? item.slot : -1;
  }

  return null;
}

module.exports = { evaluate };
