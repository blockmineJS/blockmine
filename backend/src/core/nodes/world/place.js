const {
  FACES,
  blockName,
  isBotMethod,
  coordsOf,
  inReach,
  blockAtCoords,
  gotoBlock,
  report,
  finish,
} = require('./blockUtils');

function findInventoryItem(bot, itemName) {
  const wanted = blockName(itemName);
  const items = typeof bot.inventory?.items === 'function' ? bot.inventory.items() : [];
  return items.find((item) => blockName(item?.name) === wanted) || null;
}

async function execute(node, context, helpers) {
  const { resolvePinValue } = helpers;
  const bot = context.bot;

  if (!bot || !isBotMethod(bot.placeBlock)) {
    await finish(node, helpers, false);
    return;
  }

  const coords = coordsOf(
    await resolvePinValue(node, 'block', null),
    await resolvePinValue(node, 'x', node.data?.x),
    await resolvePinValue(node, 'y', node.data?.y),
    await resolvePinValue(node, 'z', node.data?.z),
  );
  const faceName = blockName(await resolvePinValue(node, 'face', node.data?.face || 'up')) || 'up';
  const face = FACES[faceName];
  const itemName = await resolvePinValue(node, 'itemName', node.data?.itemName);

  if (!coords || !face) {
    await finish(node, helpers, false);
    return;
  }

  try {
    let reference = blockAtCoords(bot, coords);
    if (!reference || reference.name === 'air' || reference.name === 'cave_air' || reference.name === 'void_air') {
      await finish(node, helpers, false);
      return;
    }

    if (!inReach(bot, coords.x, coords.y, coords.z)) {
      const moved = await gotoBlock(bot, coords.x, coords.y, coords.z);
      reference = blockAtCoords(bot, coords);
      if (!moved || !reference || !inReach(bot, coords.x, coords.y, coords.z)) {
        await finish(node, helpers, false);
        return;
      }
    }

    if (itemName) {
      const item = findInventoryItem(bot, itemName);
      if (!item || !isBotMethod(bot.equip)) {
        await finish(node, helpers, false);
        return;
      }
      await bot.equip(item, 'hand');
    }

    await bot.placeBlock(reference, face);
    await finish(node, helpers, true, {
      x: coords.x + face.x,
      y: coords.y + face.y,
      z: coords.z + face.z,
    });
  } catch (error) {
    report(bot, `[world:place] ${error.message}`);
    await finish(node, helpers, false);
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;
  if (pinId === 'success') return memo.get(`${node.id}:success`) ?? false;
  return memo.get(`${node.id}:${pinId}`) ?? null;
}

module.exports = { execute, evaluate };
