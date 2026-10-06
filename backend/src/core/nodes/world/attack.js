const {
  isBotMethod,
  distanceBetween,
  gotoNear,
  report,
  finish,
} = require('./blockUtils');

async function execute(node, context, helpers) {
  const { resolvePinValue } = helpers;
  const bot = context.bot;
  const entityData = await resolvePinValue(node, 'entity', null);
  const entityId = entityData?.id;

  if (!bot || entityId == null || !isBotMethod(bot.attack) || !bot.entity?.position) {
    await finish(node, helpers, false);
    return;
  }

  const live = () => bot.entities?.[entityId];
  let target = live();
  if (!target?.position) {
    await finish(node, helpers, false);
    return;
  }

  try {
    if (distanceBetween(bot.entity.position, target.position) > 3) {
      const moved = await gotoNear(bot, target.position.x, target.position.y, target.position.z, 2);
      target = live();
      if (!moved || !target?.position || distanceBetween(bot.entity.position, target.position) > 3) {
        await finish(node, helpers, false);
        return;
      }
    }

    bot.attack(target);
    await finish(node, helpers, true);
  } catch (error) {
    report(bot, `[world:attack] ${error.message}`);
    await finish(node, helpers, false);
  }
}

async function evaluate(node, pinId, context, helpers) {
  if (pinId === 'success') return helpers.memo.get(`${node.id}:success`) ?? false;
  return null;
}

module.exports = { execute, evaluate };
