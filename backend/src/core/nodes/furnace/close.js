/**
 * furnace:close - Печка: закрыть
 *
 * Закрывает открытую печку.
 */
async function execute(node, context, helpers) {
  const { traverse } = helpers;
  const bot = context.bot;

  try {
    if (context.openFurnace) {
      context.openFurnace.close();
      context.openFurnace = null;
    } else if (bot?.currentWindow) {
      bot.closeWindow(bot.currentWindow);
    }

    await traverse(node, 'exec');
  } catch (error) {
    await traverse(node, 'exec');
  }
}

module.exports = { execute };
