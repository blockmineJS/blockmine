const {
  blockName,
  blockAge,
  isBotMethod,
  clampCount,
  report,
  finish,
} = require('./blockUtils');

function describeBlock(block) {
  return {
    x: block.position.x,
    y: block.position.y,
    z: block.position.z,
    name: block.name,
    age: blockAge(block),
  };
}

async function execute(node, context, helpers) {
  const { resolvePinValue } = helpers;
  const bot = context.bot;
  const empty = { block: null, blocks: [], x: null, y: null, z: null, name: null, age: null };

  if (!bot || !isBotMethod(bot.findBlocks) || !isBotMethod(bot.blockAt)) {
    await finish(node, helpers, false, empty);
    return;
  }

  const name = blockName(await resolvePinValue(node, 'name', node.data?.name));
  const radius = clampCount(await resolvePinValue(node, 'radius', node.data?.radius), 16, 1, 64);
  const count = clampCount(await resolvePinValue(node, 'count', node.data?.count), 1, 1, 32);
  const minAgeRaw = await resolvePinValue(node, 'minAge', node.data?.minAge);
  const minAge = minAgeRaw === '' || minAgeRaw === null || minAgeRaw === undefined
    ? null
    : Number(minAgeRaw);
  const hasMinAge = Number.isFinite(minAge);

  if (!name) {
    await finish(node, helpers, false, empty);
    return;
  }

  const matching = (block) => {
    if (!block || blockName(block.name) !== name) return false;
    if (!hasMinAge) return true;
    const age = blockAge(block);
    return age != null && age >= minAge;
  };

  try {
    const positions = bot.findBlocks({ matching, maxDistance: radius, count });
    if (!Array.isArray(positions) || positions.length === 0) {
      await finish(node, helpers, false, empty);
      return;
    }

    const blocks = [];
    for (const position of positions) {
      const block = bot.blockAt(position);
      if (!block?.position || !matching(block)) continue;
      blocks.push(describeBlock(block));
    }

    if (blocks.length === 0) {
      await finish(node, helpers, false, empty);
      return;
    }

    const first = blocks[0];
    await finish(node, helpers, true, {
      block: first,
      blocks,
      x: first.x,
      y: first.y,
      z: first.z,
      name: first.name,
      age: first.age,
    });
  } catch (error) {
    report(bot, `[world:find_block] ${error.message}`);
    await finish(node, helpers, false, empty);
  }
}

async function evaluate(node, pinId, context, helpers) {
  const { memo } = helpers;
  if (pinId === 'success') return memo.get(`${node.id}:success`) ?? false;
  if (pinId === 'blocks') return memo.get(`${node.id}:blocks`) ?? [];
  return memo.get(`${node.id}:${pinId}`) ?? null;
}

module.exports = { execute, evaluate };
