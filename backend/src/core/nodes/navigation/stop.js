/**
 * navigation:stop - Остановить движение бота
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;

  if (pinId === 'exec') {
    return true;
  }

  if (!bot?.pathfinder) {
    return null;
  }

  try {
    bot.pathfinder.setGoal(null);

    bot.clearControlStates();
  } catch (error) {
    console.error('[navigation:stop] Error:', error.message);
  }

  return null;
}

module.exports = { evaluate };
