/**
 * inventory:count_item - Подсчитать общее количество предмета в инвентаре
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const itemName = await helpers.resolvePinValue(node, 'itemName');

  if (!bot?.inventory || !itemName) {
    return 0;
  }

  // Ищем все предметы с таким именем и суммируем количество
  const searchName = itemName.toLowerCase().replace('minecraft:', '');
  const totalCount = bot.inventory.items()
    .filter(i =>
      i.name.toLowerCase().includes(searchName) ||
      i.displayName?.toLowerCase().includes(searchName)
    )
    .reduce((sum, item) => sum + item.count, 0);

  if (pinId === 'count') {
    return totalCount;
  }

  return null;
}

module.exports = { evaluate };
