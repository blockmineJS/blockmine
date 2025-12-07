const { goals } = require('mineflayer-pathfinder');

/**
 * navigation:go_to_entity - Идти к сущности
 */
async function evaluate(node, pinId, context, helpers) {
  const bot = context.bot;

  if (pinId === 'exec' || pinId === 'exec_failed') {
    return true;
  }

  if (!bot?.pathfinder) {
    if (pinId === 'success') return false;
    return null;
  }

  const entityData = await helpers.resolvePinValue(node, 'entity');
  const range = (await helpers.resolvePinValue(node, 'range')) || 2;

  if (!entityData) {
    if (pinId === 'success') return false;
    context._nextExecPin = 'exec_failed';
    return null;
  }

  try {
    // entityData может быть объектом с id или position
    let targetPos;

    if (entityData.id !== undefined) {
      // Ищем актуальную сущность по id
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
      if (pinId === 'success') return false;
      context._nextExecPin = 'exec_failed';
      return null;
    }

    const goal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, range);
    await bot.pathfinder.goto(goal);

    if (pinId === 'success') {
      return true;
    }

    context._nextExecPin = 'exec';
  } catch (error) {
    console.error('[navigation:go_to_entity] Error:', error.message);

    if (pinId === 'success') return false;

    context._nextExecPin = 'exec_failed';
  }

  return null;
}

module.exports = { evaluate };
