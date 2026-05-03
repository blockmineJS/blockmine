const { goals } = require('mineflayer-pathfinder');

async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot?.pathfinder) {
    memo.set(`${node.id}:following`, false);
    await traverse(node, 'exec');
    return;
  }

  const target = await resolvePinValue(node, 'target', node.data?.target);
  const range = await resolvePinValue(node, 'range', node.data?.range) ?? 3;

  if (!target) {
    memo.set(`${node.id}:following`, false);
    await traverse(node, 'exec');
    return;
  }

  try {
    const player = bot.players[target];

    if (!player?.entity) {
      console.error(`[navigation:follow] Player "${target}" not found or not visible`);
      memo.set(`${node.id}:following`, false);
      await traverse(node, 'exec');
      return;
    }

    const goal = new goals.GoalFollow(player.entity, Number(range));
    bot.pathfinder.setGoal(goal, true);

    memo.set(`${node.id}:following`, true);
    await traverse(node, 'exec');
  } catch (error) {
    console.error('[navigation:follow] Error:', error.message);
    memo.set(`${node.id}:following`, false);
    await traverse(node, 'exec');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'following') {
    return memo.get(`${node.id}:following`) ?? false;
  }

  return null;
}

module.exports = { execute, evaluate };