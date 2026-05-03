async function execute(node, context, helpers) {
  const { traverse } = helpers;
  const bot = context.bot;

  try {
    if (bot?.pathfinder) {
      bot.pathfinder.setGoal(null);
      bot.clearControlStates();
    }
    await traverse(node, 'exec');
  } catch (error) {
    console.error('[navigation:stop] Error:', error.message);
    await traverse(node, 'exec');
  }
}

module.exports = { execute };