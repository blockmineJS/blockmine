const { goals } = require('mineflayer-pathfinder');

async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot?.pathfinder) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
    return;
  }

  const x = await resolvePinValue(node, 'x', node.data?.x) ?? 0;
  const y = await resolvePinValue(node, 'y', node.data?.y) ?? 64;
  const z = await resolvePinValue(node, 'z', node.data?.z) ?? 0;
  const range = await resolvePinValue(node, 'range', node.data?.range) ?? 1;

  try {
    const goal = new goals.GoalNear(Number(x), Number(y), Number(z), Number(range));
    await bot.pathfinder.goto(goal);

    memo.set(`${node.id}:success`, true);
    await traverse(node, 'exec');
  } catch (error) {
    console.error('[navigation:go_to] Error:', error.message);
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