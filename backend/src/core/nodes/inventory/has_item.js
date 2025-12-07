/**
 * inventory:has_item - Проверить наличие предмета в инвентаре
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const itemName = await helpers.resolvePinValue(node, 'itemName');
  const minCount = (await helpers.resolvePinValue(node, 'minCount')) ?? 1;

  if (!bot?.inventory || !itemName) {
    if (pinId === 'hasItem') return false;
    if (pinId === 'actualCount') return 0;
    return null;
  }

  // Подсчитываем общее количество предмета
  const searchName = itemName.toLowerCase().replace('minecraft:', '');
  const actualCount = bot.inventory.items()
    .filter(i =>
      i.name.toLowerCase().includes(searchName) ||
      i.displayName?.toLowerCase().includes(searchName)
    )
    .reduce((sum, item) => sum + item.count, 0);

  if (pinId === 'hasItem') {
    return actualCount >= minCount;
  }

  if (pinId === 'actualCount') {
    return actualCount;
  }

  return null;
}

module.exports = { evaluate };
