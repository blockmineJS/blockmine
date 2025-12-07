const { goals } = require('mineflayer-pathfinder');

/**
 * navigation:follow - Следовать за игроком
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;

  if (pinId === 'exec') {
    return true;
  }

  if (!bot?.pathfinder) {
    if (pinId === 'following') return false;
    return null;
  }

  const target = await helpers.resolvePinValue(node, 'target');
  const range = (await helpers.resolvePinValue(node, 'range')) || 3;

  if (!target) {
    if (pinId === 'following') return false;
    return null;
  }

  try {
    const player = bot.players[target];

    if (!player?.entity) {
      console.error(`[navigation:follow] Player "${target}" not found or not visible`);
      if (pinId === 'following') return false;
      return null;
    }

    // Используем GoalFollow для непрерывного следования
    const goal = new goals.GoalFollow(player.entity, range);
    bot.pathfinder.setGoal(goal, true); // true = dynamic, обновляется при движении цели

    if (pinId === 'following') {
      return true;
    }
  } catch (error) {
    console.error('[navigation:follow] Error:', error.message);

    if (pinId === 'following') return false;
  }

  return null;
}

module.exports = { evaluate };
