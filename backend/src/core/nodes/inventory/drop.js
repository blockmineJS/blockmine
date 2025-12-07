/**
 * inventory:drop - Выбросить предмет из инвентаря
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const itemName = await helpers.resolvePinValue(node, 'itemName');
  const count = await helpers.resolvePinValue(node, 'count');
  const dropAll = await helpers.resolvePinValue(node, 'dropAll');

  if (pinId === 'exec') {
    return true; // Exec output
  }

  if (!bot?.inventory || !itemName) {
    if (pinId === 'dropped') return 0;
    return null;
  }

  try {
    // Ищем предмет(ы) в инвентаре
    const searchName = itemName.toLowerCase().replace('minecraft:', '');
    const items = bot.inventory.items().filter(i =>
      i.name.toLowerCase().includes(searchName) ||
      i.displayName?.toLowerCase().includes(searchName)
    );

    if (items.length === 0) {
      if (pinId === 'dropped') return 0;
      return null;
    }

    let totalDropped = 0;

    if (dropAll) {
      // Выбрасываем все такие предметы
      for (const item of items) {
        await bot.tossStack(item);
        totalDropped += item.count;
      }
    } else {
      // Выбрасываем указанное количество или один стак
      const item = items[0];
      const toDrop = count || item.count;

      if (toDrop >= item.count) {
        await bot.tossStack(item);
        totalDropped = item.count;
      } else {
        await bot.toss(item.type, item.metadata, toDrop);
        totalDropped = toDrop;
      }
    }

    if (pinId === 'dropped') {
      return totalDropped;
    }
  } catch (error) {
    console.error('[inventory:drop] Error:', error.message);
    if (pinId === 'dropped') return 0;
  }

  return null;
}

module.exports = { evaluate };
