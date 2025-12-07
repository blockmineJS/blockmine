const { goals } = require('mineflayer-pathfinder');

/**
 * navigation:go_to_player - Идти к игроку
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;

  if (pinId === 'exec' || pinId === 'exec_failed') {
    return true;
  }

  if (!bot?.pathfinder) {
    if (pinId === 'success') return false;
    if (pinId === 'playerPosition') return null;
    return null;
  }

  const playerName = await helpers.resolvePinValue(node, 'playerName');
  const range = (await helpers.resolvePinValue(node, 'range')) || 2;

  if (!playerName) {
    if (pinId === 'success') return false;
    if (pinId === 'playerPosition') return null;
    context._nextExecPin = 'exec_failed';
    return null;
  }

  try {
    const player = bot.players[playerName];

    if (!player?.entity) {
      console.error(`[navigation:go_to_player] Player "${playerName}" not found or not visible`);
      if (pinId === 'success') return false;
      if (pinId === 'playerPosition') return null;
      context._nextExecPin = 'exec_failed';
      return null;
    }

    const playerPos = player.entity.position;

    if (pinId === 'playerPosition') {
      return {
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z
      };
    }

    const goal = new goals.GoalNear(playerPos.x, playerPos.y, playerPos.z, range);
    await bot.pathfinder.goto(goal);

    if (pinId === 'success') {
      return true;
    }

    context._nextExecPin = 'exec';
  } catch (error) {
    console.error('[navigation:go_to_player] Error:', error.message);

    if (pinId === 'success') return false;
    if (pinId === 'playerPosition') return null;

    context._nextExecPin = 'exec_failed';
  }

  return null;
}

module.exports = { evaluate };
