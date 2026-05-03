async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot?.inventory) {
    memo.set(`${node.id}:dropped`, 0);
    await traverse(node, 'exec');
    return;
  }

  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);
  const count = await resolvePinValue(node, 'count', node.data?.count);
  const dropAll = await resolvePinValue(node, 'dropAll', node.data?.dropAll);

  if (!itemName) {
    memo.set(`${node.id}:dropped`, 0);
    await traverse(node, 'exec');
    return;
  }

  try {
    const searchName = itemName.toLowerCase().replace('minecraft:', '');
    const items = bot.inventory.items().filter(i =>
      i.name.toLowerCase().includes(searchName) ||
      i.displayName?.toLowerCase().includes(searchName)
    );

    if (items.length === 0) {
      memo.set(`${node.id}:dropped`, 0);
      await traverse(node, 'exec');
      return;
    }

    let totalDropped = 0;

    if (dropAll) {
      for (const item of items) {
        await bot.tossStack(item);
        totalDropped += item.count;
      }
    } else {
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

    memo.set(`${node.id}:dropped`, totalDropped);
    await traverse(node, 'exec');
  } catch (error) {
    console.error('[inventory:drop] Error:', error.message);
    memo.set(`${node.id}:dropped`, 0);
    await traverse(node, 'exec');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'dropped') {
    return memo.get(`${node.id}:dropped`) ?? 0;
  }

  return null;
}

module.exports = { execute, evaluate };