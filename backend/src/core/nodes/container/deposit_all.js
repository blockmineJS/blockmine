/**
 * container:deposit_all - Положить все предметы в контейнер
 *
 * Executor для action ноды с exec пинами.
 */
async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;
  const container = context.openContainer;

  if (!bot || !container) {
    memo.set(`${node.id}:deposited`, 0);
    await traverse(node, 'exec');
    return;
  }

  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);
  const keepOne = await resolvePinValue(node, 'keepOne', node.data?.keepOne);

  try {
    const searchName = itemName ? itemName.toLowerCase().replace('minecraft:', '') : null;

    // Получаем предметы из инвентаря
    let items = bot.inventory.items();

    // Фильтруем по имени если указано
    if (searchName) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchName) ||
        item.displayName?.toLowerCase().includes(searchName)
      );
    }

    let deposited = 0;

    for (const item of items) {
      const toDeposit = keepOne ? Math.max(0, item.count - 1) : item.count;

      if (toDeposit <= 0) continue;

      try {
        await container.deposit(item.type, item.metadata, toDeposit);
        deposited += toDeposit;
      } catch (e) {
        break;
      }
    }

    memo.set(`${node.id}:deposited`, deposited);

    await traverse(node, 'exec');
  } catch (error) {
    memo.set(`${node.id}:deposited`, 0);
    await traverse(node, 'exec');
  }
}

/**
 * Evaluator для data пинов (deposited)
 */
async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'deposited') {
    return memo.get(`${node.id}:deposited`) ?? 0;
  }

  return null;
}

module.exports = { execute, evaluate };
