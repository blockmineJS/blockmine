/**
 * furnace:put_input - Печка: положить для плавки
 *
 * Кладёт предмет в слот плавки печки.
 */
async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;
  const furnace = context.openFurnace;

  if (!bot || !furnace) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
    return;
  }

  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);
  const count = await resolvePinValue(node, 'count', node.data?.count);

  if (!itemName) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
    return;
  }

  try {
    const searchName = itemName.toLowerCase().replace('minecraft:', '');

    // Ищем предмет в инвентаре
    const item = bot.inventory.items().find(i =>
      i.name.toLowerCase().includes(searchName) ||
      i.displayName?.toLowerCase().includes(searchName)
    );

    if (!item) {
      memo.set(`${node.id}:success`, false);
      await traverse(node, 'exec_failed');
      return;
    }

    const amount = count ? Math.min(count, item.count) : item.count;

    // Кладём в слот плавки
    await furnace.putInput(item.type, item.metadata, amount);

    memo.set(`${node.id}:success`, true);
    await traverse(node, 'exec');
  } catch (error) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
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
