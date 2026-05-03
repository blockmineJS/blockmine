async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot) {
    await traverse(node, 'exec');
    return;
  }

  const slot = await resolvePinValue(node, 'slot', node.data?.slot);

  if (slot === undefined || slot === null) {
    await traverse(node, 'exec');
    return;
  }

  try {
    const slotNumber = Math.max(0, Math.min(8, parseInt(slot)));
    bot.setQuickBarSlot(slotNumber);

    const item = bot.inventory.slots[slotNumber + 36];
    memo.set(`${node.id}:item`, item ? {
      name: item.name,
      displayName: item.displayName,
      count: item.count,
      slot: item.slot,
      type: item.type,
      metadata: item.metadata
    } : null);

    await traverse(node, 'exec');
  } catch (error) {
    console.error('[inventory:select_slot] Error:', error.message);
    await traverse(node, 'exec');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'item') {
    return memo.get(`${node.id}:item`) ?? null;
  }

  return null;
}

module.exports = { execute, evaluate };