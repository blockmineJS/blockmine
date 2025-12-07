/**
 * container:deposit - Положить предмет в контейнер
 *
 * Executor для action ноды с exec пинами.
 */
async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;
  const container = context.openContainer;

  if (!bot || !container) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:deposited`, 0);
    await traverse(node, 'exec_failed');
    return;
  }

  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);
  const count = await resolvePinValue(node, 'count', node.data?.count);

  if (!itemName) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:deposited`, 0);
    await traverse(node, 'exec_failed');
    return;
  }

  try {
    const searchName = itemName.toLowerCase().replace('minecraft:', '');

    // Ищем предметы в инвентаре бота
    const items = bot.inventory.items().filter(item =>
      item.name.toLowerCase().includes(searchName) ||
      item.displayName?.toLowerCase().includes(searchName)
    );

    if (items.length === 0) {
      memo.set(`${node.id}:success`, false);
      memo.set(`${node.id}:deposited`, 0);
      await traverse(node, 'exec_failed');
      return;
    }

    let deposited = 0;
    let remaining = count || Infinity;

    for (const item of items) {
      if (remaining <= 0) break;

      const toDeposit = Math.min(item.count, remaining);

      try {
        await container.deposit(item.type, item.metadata, toDeposit);
        deposited += toDeposit;
        remaining -= toDeposit;
      } catch (e) {
        break;
      }
    }

    memo.set(`${node.id}:deposited`, deposited);
    memo.set(`${node.id}:success`, deposited > 0);

    await traverse(node, deposited > 0 ? 'exec' : 'exec_failed');
  } catch (error) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:deposited`, 0);
    await traverse(node, 'exec_failed');
  }
}

/**
 * Evaluator для data пинов (success, deposited)
 */
async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }
  if (pinId === 'deposited') {
    return memo.get(`${node.id}:deposited`) ?? 0;
  }

  return null;
}

module.exports = { execute, evaluate };
