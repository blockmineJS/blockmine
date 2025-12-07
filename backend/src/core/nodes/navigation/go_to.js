const { goals } = require('mineflayer-pathfinder');

/**
 * navigation:go_to - Идти к указанным координатам
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;

  if (pinId === 'exec' || pinId === 'exec_failed') {
    // Exec выходы обрабатываются движком
    return true;
  }

  if (!bot?.pathfinder) {
    if (pinId === 'success') return false;
    return null;
  }

  const x = await helpers.resolvePinValue(node, 'x');
  const y = await helpers.resolvePinValue(node, 'y');
  const z = await helpers.resolvePinValue(node, 'z');
  const range = (await helpers.resolvePinValue(node, 'range')) || 1;

  // Используем данные ноды если входы не подключены
  const targetX = x ?? node.data?.x ?? 0;
  const targetY = y ?? node.data?.y ?? 64;
  const targetZ = z ?? node.data?.z ?? 0;

  try {
    const goal = new goals.GoalNear(targetX, targetY, targetZ, range);
    await bot.pathfinder.goto(goal);

    if (pinId === 'success') {
      return true;
    }

    // Указываем движку какой exec выход активировать
    context._nextExecPin = 'exec';
  } catch (error) {
    console.error('[navigation:go_to] Error:', error.message);

    if (pinId === 'success') {
      return false;
    }

    // При ошибке активируем exec_failed
    context._nextExecPin = 'exec_failed';
  }

  return null;
}

module.exports = { evaluate };
