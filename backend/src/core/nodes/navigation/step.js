const { goals } = require('mineflayer-pathfinder');
const { isBotMethod, clampCount, report, finish } = require('../world/blockUtils');
const { relativeOffset } = require('./relativeOffset');

async function execute(node, context, helpers) {
  const { resolvePinValue } = helpers;
  const bot = context.bot;
  const direction = String(await resolvePinValue(node, 'direction', node.data?.direction || 'forward') || 'forward');
  const distance = clampCount(await resolvePinValue(node, 'distance', node.data?.distance), 1, 1, 64);
  const position = bot?.entity?.position;
  const yaw = bot?.entity?.yaw;

  if (!bot || !position || !Number.isFinite(Number(yaw)) || !isBotMethod(bot.pathfinder?.goto)) {
    await finish(node, helpers, false);
    return;
  }

  const offset = relativeOffset(Number(yaw), direction, distance);
  if (!offset) {
    await finish(node, helpers, false);
    return;
  }

  const target = {
    x: Number(position.x) + offset.x,
    y: Number(position.y),
    z: Number(position.z) + offset.z,
  };

  try {
    await bot.pathfinder.goto(new goals.GoalNear(target.x, target.y, target.z, 1));
    await finish(node, helpers, true, target);
  } catch (error) {
    report(bot, `[navigation:step] ${error.message}`);
    await finish(node, helpers, false);
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;
  if (pinId === 'success') return memo.get(`${node.id}:success`) ?? false;
  return memo.get(`${node.id}:${pinId}`) ?? null;
}

module.exports = { execute, evaluate };
