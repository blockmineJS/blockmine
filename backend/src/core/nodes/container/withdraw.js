/**
 * container:withdraw - Забрать предмет из контейнера
 *
 * Executor для action ноды с exec пинами.
 */
async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;
  const container = context.openContainer;

  if (!bot || !container) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:withdrawn`, 0);
    await traverse(node, 'exec_failed');
    return;
  }

  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);
  const count = await resolvePinValue(node, 'count', node.data?.count);

  if (!itemName) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:withdrawn`, 0);
    await traverse(node, 'exec_failed');
    return;
  }

  try {
    const searchName = itemName.toLowerCase().replace('minecraft:', '');

    // Ищем предметы в контейнере
    const containerItems = container.containerItems ? container.containerItems() : [];
    const items = containerItems.filter(item =>
      item && (
        item.name.toLowerCase().includes(searchName) ||
        item.displayName?.toLowerCase().includes(searchName)
      )
    );

    if (items.length === 0) {
      memo.set(`${node.id}:success`, false);
      memo.set(`${node.id}:withdrawn`, 0);
      await traverse(node, 'exec_failed');
      return;
    }

    let withdrawn = 0;
    let remaining = count || Infinity;

    for (const item of items) {
      if (remaining <= 0) break;

      const toWithdraw = Math.min(item.count, remaining);

      try {
        await container.withdraw(item.type, item.metadata, toWithdraw);
        withdrawn += toWithdraw;
        remaining -= toWithdraw;
      } catch (e) {
        break;
      }
    }

    memo.set(`${node.id}:withdrawn`, withdrawn);
    memo.set(`${node.id}:success`, withdrawn > 0);

    await traverse(node, withdrawn > 0 ? 'exec' : 'exec_failed');
  } catch (error) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:withdrawn`, 0);
    await traverse(node, 'exec_failed');
  }
}

/**
 * Evaluator для data пинов (success, withdrawn)
 */
async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }
  if (pinId === 'withdrawn') {
    return memo.get(`${node.id}:withdrawn`) ?? 0;
  }

  return null;
}

module.exports = { execute, evaluate };
