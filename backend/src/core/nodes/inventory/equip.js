/**
 * inventory:equip - Экипировать предмет
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const itemName = await helpers.resolvePinValue(node, 'itemName');
  const destination = (await helpers.resolvePinValue(node, 'destination')) || 'hand';

  if (pinId === 'exec') {
    return true; // Exec output
  }

  if (!bot?.inventory || !itemName) {
    if (pinId === 'success') return false;
    return null;
  }

  try {
    // Ищем предмет в инвентаре
    const searchName = itemName.toLowerCase().replace('minecraft:', '');
    const item = bot.inventory.items().find(i =>
      i.name.toLowerCase().includes(searchName) ||
      i.displayName?.toLowerCase().includes(searchName)
    );

    if (!item) {
      if (pinId === 'success') return false;
      return null;
    }

    // Экипируем предмет
    await bot.equip(item, destination);

    if (pinId === 'success') {
      return true;
    }
  } catch (error) {
    console.error('[inventory:equip] Error:', error.message);
    if (pinId === 'success') return false;
  }

  return null;
}

module.exports = { evaluate };
