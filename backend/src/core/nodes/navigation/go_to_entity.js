const { goals } = require('mineflayer-pathfinder');

async function execute(node, context, helpers) {
  const { resolvePinValue, traverse, memo } = helpers;
  const bot = context.bot;

  if (!bot?.pathfinder) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
    return;
  }

  const entityData = await resolvePinValue(node, 'entity', null);
  const range = await resolvePinValue(node, 'range', node.data?.range) ?? 2;

  if (!entityData) {
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
    return;
  }

  try {
    let targetPos;

    if (entityData.id !== undefined) {
      const entity = bot.entities[entityData.id];
      if (entity?.position) {
        targetPos = entity.position;
      }
    }

    if (!targetPos && entityData.position) {
      targetPos = entityData.position;
    }

    if (!targetPos) {
      console.error('[navigation:go_to_entity] Entity position not found');
      memo.set(`${node.id}:success`, false);
      await traverse(node, 'exec_failed');
      return;
    }

    const goal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, Number(range));
    await bot.pathfinder.goto(goal);

    memo.set(`${node.id}:success`, true);
    await traverse(node, 'exec');
  } catch (error) {
    console.error('[navigation:go_to_entity] Error:', error.message);
    memo.set(`${node.id}:success`, false);
    await traverse(node, 'exec_failed');
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;

  if (pinId === 'success') {
    return memo.get(`${node.id}:success`) ?? false;
  }

  return null;
}

module.exports = { execute, evaluate };