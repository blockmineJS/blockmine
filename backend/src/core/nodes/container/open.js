const Vec3 = require('vec3');

/**
 * container:open - Открыть контейнер по координатам
 *
 * Executor для action ноды с exec пинами.
 * Использует helpers.traverse для перехода к следующему exec выходу.
 */
async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:container`, null);
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
      memo.set(`${node.id}:container`, null);
      await traverse(node, 'exec_failed');
      return;
    }

    const containerTypes = [
      'chest', 'trapped_chest', 'barrel', 'shulker_box',
      'hopper', 'dropper', 'dispenser', 'furnace',
      'blast_furnace', 'smoker', 'brewing_stand'
    ];
    const isContainer = containerTypes.some(type => block.name.includes(type));

    if (!isContainer) {
      memo.set(`${node.id}:success`, false);
      memo.set(`${node.id}:container`, null);
      await traverse(node, 'exec_failed');
      return;
    }

    const distance = bot.entity.position.distanceTo(block.position);

    if (distance > 4) {
      if (bot.pathfinder) {
        const { goals } = require('mineflayer-pathfinder');
        const goal = new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2);
        await bot.pathfinder.goto(goal);
      } else {
        memo.set(`${node.id}:success`, false);
        memo.set(`${node.id}:container`, null);
        await traverse(node, 'exec_failed');
        return;
      }
    }

    if (bot.currentWindow) {
      bot.closeWindow(bot.currentWindow);
      await new Promise(r => setTimeout(r, 300));
    }

    const blockCenter = block.position.offset(0.5, 0.5, 0.5);
    await bot.lookAt(blockCenter);
    await new Promise(r => setTimeout(r, 100));

    const container = await bot.openContainer(block);

    if (!container) {
      throw new Error('Container is null');
    }

    context.openContainer = container;

    memo.set(`${node.id}:success`, true);
    memo.set(`${node.id}:container`, container);

    await traverse(node, 'exec');
  } catch (error) {
    memo.set(`${node.id}:success`, false);
    memo.set(`${node.id}:container`, null);
    await traverse(node, 'exec_failed');
  }
}

/**
 * Evaluator для data пинов (success, container)
 */
async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }
  if (pinId === 'container') {
    return memo.get(`${node.id}:container`) ?? context.openContainer ?? null;
  }

  return null;
}

module.exports = { execute, evaluate };
