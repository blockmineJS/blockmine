/**
 * inventory:get_slot - Получить предмет в указанном слоте
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const slotNumber = await helpers.resolvePinValue(node, 'slotNumber');

  if (!bot?.inventory || slotNumber === undefined || slotNumber === null) {
    if (pinId === 'item') return null;
    if (pinId === 'isEmpty') return true;
    return null;
  }

  // Получаем предмет в слоте
  const item = bot.inventory.slots[slotNumber];

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

  if (pinId === 'isEmpty') {
    return !item;
  }

  return null;
}

module.exports = { evaluate };
