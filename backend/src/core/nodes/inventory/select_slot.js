/**
 * inventory:select_slot - Выбрать слот хотбара
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;
  const slot = await helpers.resolvePinValue(node, 'slot');

  if (pinId === 'exec') {
    return true; // Exec output
  }

  if (!bot?.inventory || slot === undefined || slot === null) {
    if (pinId === 'item') return null;
    return null;
  }

  try {
    // Валидация номера слота (0-8)
    const slotNumber = Math.max(0, Math.min(8, parseInt(slot)));

    // Устанавливаем выбранный слот
    bot.setQuickBarSlot(slotNumber);

    if (pinId === 'item') {
      // Возвращаем предмет в выбранном слоте
      const item = bot.inventory.slots[slotNumber + 36]; // Хотбар начинается с 36
      if (!item) return null;

      return {
        name: item.name,
        displayName: item.displayName,
        count: item.count,
        slot: item.slot,
        type: item.type,
        metadata: item.metadata
      };
    }
  } catch (error) {
    console.error('[inventory:select_slot] Error:', error.message);
    if (pinId === 'item') return null;
  }

  return null;
}

module.exports = { evaluate };
