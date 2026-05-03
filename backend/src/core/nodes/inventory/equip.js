async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec');
    return;
  }

  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);
  const destination = await resolvePinValue(node, 'destination', node.data?.destination) || 'hand';

  if (!itemName) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec');
    return;
  }

  try {
    const searchName = itemName.toLowerCase().replace('minecraft:', '');
    const item = bot.inventory.items().find(i =>
      i.name.toLowerCase().includes(searchName) ||
      i.displayName?.toLowerCase().includes(searchName)
    );

    if (!item) {
      memo.set(`${node.id}:success`, false);
      await traverse(node, 'exec');
      return;
    }

    await bot.equip(item, destination);

    memo.set(`${node.id}:success`, true);
    await traverse(node, 'exec');
  } catch (error) {
    console.error('[inventory:equip] Error:', error.message);
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }

  return null;
}

module.exports = { execute, evaluate };