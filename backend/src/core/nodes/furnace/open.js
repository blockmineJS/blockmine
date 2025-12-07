const Vec3 = require('vec3');

/**
 * furnace:open - Печка: открыть
 *
 * Открывает печку по координатам.
 * Поддерживает: furnace, blast_furnace, smoker
 */
async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:furnace`, null);
    await traverse(node, 'exec_failed');
    return;
  }

  const x = await resolvePinValue(node, 'x', node.data?.x);
  const y = await resolvePinValue(node, 'y', node.data?.y);
  const z = await resolvePinValue(node, 'z', node.data?.z);

  const targetX = Number(x ?? 0);
  const targetY = Number(y ?? 64);
  const targetZ = Number(z ?? 0);

  try {
    const block = bot.blockAt(new Vec3(targetX, targetY, targetZ));

    if (!block) {
      memo.set(`${node.id}:success`, false);
      memo.set(`${node.id}:furnace`, null);
      await traverse(node, 'exec_failed');
      return;
    }

    // Проверяем что это печка
    const furnaceTypes = ['furnace', 'blast_furnace', 'smoker'];
    const isFurnace = furnaceTypes.some(type => block.name.includes(type));

    if (!isFurnace) {
      memo.set(`${node.id}:success`, false);
      memo.set(`${node.id}:furnace`, null);
      await traverse(node, 'exec_failed');
      return;
    }

    // Проверяем расстояние
    const distance = bot.entity.position.distanceTo(block.position);

    if (distance > 4) {
      if (bot.pathfinder) {
        const { goals } = require('mineflayer-pathfinder');
        const goal = new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2);
        await bot.pathfinder.goto(goal);
      } else {
        memo.set(`${node.id}:success`, false);
        memo.set(`${node.id}:furnace`, null);
        await traverse(node, 'exec_failed');
        return;
      }
    }

    // Закрываем текущее окно если есть
    if (bot.currentWindow) {
      bot.closeWindow(bot.currentWindow);
      await new Promise(r => setTimeout(r, 300));
    }

    // Смотрим на печку
    const blockCenter = block.position.offset(0.5, 0.5, 0.5);
    await bot.lookAt(blockCenter);
    await new Promise(r => setTimeout(r, 100));

    // Открываем печку
    const furnace = await bot.openFurnace(block);

    if (!furnace) {
      throw new Error('Furnace is null');
    }

    // Сохраняем печку в контексте
    context.openFurnace = furnace;

    memo.set(`${node.id}:success`, true);
    memo.set(`${node.id}:furnace`, furnace);

    await traverse(node, 'exec');
  } catch (error) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:furnace`, null);
    await traverse(node, 'exec_failed');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }
  if (pinId === 'furnace') {
    return memo.get(`${node.id}:furnace`) ?? context.openFurnace ?? null;
  }

  return null;
}

module.exports = { execute, evaluate };
