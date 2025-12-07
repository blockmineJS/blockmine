/**
 * furnace:take_output - Печка: забрать результат
 *
 * Забирает готовый предмет из слота результата печки.
 */
async function execute(node, context, helpers) {
  const { traverse, memo } = helpers;
  const bot = context.bot;
  const furnace = context.openFurnace;

  if (!bot || !furnace) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:item`, null);
    memo.set(`${node.id}:count`, 0);
    await traverse(node, 'exec_failed');
    return;
  }

  try {
    // Проверяем есть ли что забирать
    const outputItem = furnace.outputItem();

    if (!outputItem) {
      memo.set(`${node.id}:success`, false);
      memo.set(`${node.id}:item`, null);
      memo.set(`${node.id}:count`, 0);
      await traverse(node, 'exec_failed');
      return;
    }

    const countBefore = outputItem.count;

    // Забираем результат
    await furnace.takeOutput();

    memo.set(`${node.id}:success`, true);
    memo.set(`${node.id}:item`, {
      name: outputItem.name,
      displayName: outputItem.displayName,
      count: countBefore
    });
    memo.set(`${node.id}:count`, countBefore);

    await traverse(node, 'exec');
  } catch (error) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:item`, null);
    memo.set(`${node.id}:count`, 0);
    await traverse(node, 'exec_failed');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }
  if (pinId === 'item') {
    return memo.get(`${node.id}:item`) ?? null;
  }
  if (pinId === 'count') {
    return memo.get(`${node.id}:count`) ?? 0;
  }

  return null;
}

module.exports = { execute, evaluate };
