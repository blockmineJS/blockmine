/**
 * inventory:get_all - Получить весь инвентарь бота
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;

  if (!bot?.inventory) {
    if (pinId === 'items') return [];
    if (pinId === 'count') return 0;
    return null;
  }

  // Получаем все непустые слоты
  const items = bot.inventory.items().map(item => {
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
  });

  if (pinId === 'items') {
    return items;
  }

  if (pinId === 'count') {
    return items.length;
  }

  return null;
}

module.exports = { evaluate };
