/**
 * container:close - Закрыть открытый контейнер
 *
 * Executor для action ноды с exec пинами.
 */
async function execute(node, context, helpers) {
  const { traverse } = helpers;
  const bot = context.bot;

  try {
    // Закрываем текущий открытый контейнер
    if (context.openContainer) {
      context.openContainer.close();
      context.openContainer = null;
    } else if (bot?.currentWindow) {
      bot.closeWindow(bot.currentWindow);
    }

    await traverse(node, 'exec');
  } catch (error) {
    // Даже при ошибке продолжаем выполнение
    await traverse(node, 'exec');
  }
}

module.exports = { execute };
