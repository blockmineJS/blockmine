const { goals } = require('mineflayer-pathfinder');

async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot?.pathfinder) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
    return;
  }

  const playerName = await resolvePinValue(node, 'playerName', node.data?.playerName);
  const range = await resolvePinValue(node, 'range', node.data?.range) ?? 3;

  if (!playerName) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
    return;
  }

  try {
    const player = bot.players[playerName];

    if (!player?.entity) {
      console.error(`[navigation:go_to_player] Player "${playerName}" not found or not visible`);
      memo.set(`${node.id}:success`, false);
      await traverse(node, 'exec_failed');
      return;
    }

    const playerPos = player.entity.position;

    memo.set(`${node.id}:playerPosition`, {
      x: playerPos.x,
      y: playerPos.y,
      z: playerPos.z
    });

    const goal = new goals.GoalNear(playerPos.x, playerPos.y, playerPos.z, Number(range));
    await bot.pathfinder.goto(goal);

    memo.set(`${node.id}:success`, true);
    await traverse(node, 'exec');
  } catch (error) {
    console.error('[navigation:go_to_player] Error:', error.message);
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }
  if (pinId === 'playerPosition') {
    return memo.get(`${node.id}:playerPosition`) ?? null;
  }

  return null;
}

module.exports = { execute, evaluate };