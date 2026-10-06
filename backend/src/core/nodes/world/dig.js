const {
  isBotMethod,
  coordsOf,
  inReach,
  blockAtCoords,
  gotoBlock,
  report,
  finish,
} = require('./blockUtils');

async function execute(node, context, helpers) {
  const { resolvePinValue } = helpers;
  const bot = context.bot;

  if (!bot || !isBotMethod(bot.dig)) {
    await finish(node, helpers, false);
    return;
  }

  const blockValue = await resolvePinValue(node, 'block', null);
  const coords = coordsOf(
    blockValue,
    await resolvePinValue(node, 'x', node.data?.x),
    await resolvePinValue(node, 'y', node.data?.y),
    await resolvePinValue(node, 'z', node.data?.z),
  );

  if (!coords) {
    await finish(node, helpers, false);
    return;
  }

  try {
    let block = blockAtCoords(bot, coords);
    if (!block || block.name === 'air' || block.name === 'cave_air' || block.name === 'void_air' || block.diggable === false) {
      await finish(node, helpers, false);
      return;
    }

    const reachable = isBotMethod(bot.canDigBlock) ? bot.canDigBlock(block) : inReach(bot, coords.x, coords.y, coords.z);
    if (!reachable) {
      const moved = await gotoBlock(bot, coords.x, coords.y, coords.z);
      block = blockAtCoords(bot, coords);
      const reached = block && (isBotMethod(bot.canDigBlock) ? bot.canDigBlock(block) : inReach(bot, coords.x, coords.y, coords.z));
      if (!moved || !reached) {
        await finish(node, helpers, false);
        return;
      }
    }

    await bot.dig(block, true);
    await finish(node, helpers, true);
  } catch (error) {
    report(bot, `[world:dig] ${error.message}`);
    await finish(node, helpers, false);
  }
}

async function evaluate(node, pinId, context, helpers) {
  if (pinId === 'success') return helpers.memo.get(`${node.id}:success`) ?? false;
  return null;
}

module.exports = { execute, evaluate };
