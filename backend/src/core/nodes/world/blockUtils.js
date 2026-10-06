const { Vec3 } = require('vec3');

const FACES = {
  up: new Vec3(0, 1, 0),
  down: new Vec3(0, -1, 0),
  north: new Vec3(0, 0, -1),
  south: new Vec3(0, 0, 1),
  east: new Vec3(1, 0, 0),
  west: new Vec3(-1, 0, 0),
};

function blockName(value) {
  return String(value || '').trim().toLowerCase().replace(/^minecraft:/, '');
}

function blockAge(block) {
  if (!block || typeof block.getProperties !== 'function') return null;
  try {
    const age = Number(block.getProperties()?.age);
    return Number.isFinite(age) ? age : null;
  } catch {
    return null;
  }
}

function isBotMethod(fn) {
  if (typeof fn !== 'function') return false;
  try {
    return !String(fn.toString()).startsWith('[mock:');
  } catch {
    return false;
  }
}

function finiteCoord(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function coordsOf(blockValue, x, y, z) {
  if (blockValue && typeof blockValue === 'object') {
    const position = blockValue.position && typeof blockValue.position === 'object'
      ? blockValue.position
      : blockValue;
    const bx = finiteCoord(position.x);
    const by = finiteCoord(position.y);
    const bz = finiteCoord(position.z);
    if (bx != null && by != null && bz != null) {
      return { x: bx, y: by, z: bz };
    }
  }

  const nx = finiteCoord(x);
  const ny = finiteCoord(y);
  const nz = finiteCoord(z);
  if (nx == null || ny == null || nz == null) return null;
  return { x: nx, y: ny, z: nz };
}

function eyePosition(bot) {
  const position = bot?.entity?.position;
  if (!position) return null;
  if (typeof position.offset === 'function') return position.offset(0, 1.65, 0);
  return { x: position.x, y: position.y + 1.65, z: position.z };
}

function distanceBetween(a, b) {
  if (!a || !b) return Infinity;
  if (typeof a.distanceTo === 'function') return a.distanceTo(b);
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  const dz = Number(a.z) - Number(b.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function inReach(bot, x, y, z, reach = 4.5) {
  const eye = eyePosition(bot);
  if (!eye) return false;
  return distanceBetween(eye, { x: x + 0.5, y: y + 0.5, z: z + 0.5 }) <= reach;
}

function blockAtCoords(bot, coords) {
  if (!coords || !isBotMethod(bot?.blockAt)) return null;
  return bot.blockAt(new Vec3(Math.floor(coords.x), Math.floor(coords.y), Math.floor(coords.z)));
}

async function gotoNear(bot, x, y, z, range) {
  if (!isBotMethod(bot?.pathfinder?.goto)) return false;
  const { goals } = require('mineflayer-pathfinder');
  await bot.pathfinder.goto(new goals.GoalNear(Number(x), Number(y), Number(z), range));
  return true;
}

async function gotoBlock(bot, x, y, z) {
  if (!isBotMethod(bot?.pathfinder?.goto)) return false;
  const { goals } = require('mineflayer-pathfinder');
  const pos = new Vec3(Math.floor(Number(x)), Math.floor(Number(y)), Math.floor(Number(z)));
  const goal = bot.world
    ? new goals.GoalLookAtBlock(pos, bot.world, { reach: 4.5 })
    : new goals.GoalNear(pos.x, pos.y, pos.z, 3);
  await bot.pathfinder.goto(goal);
  return true;
}

function clampCount(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function report(bot, text) {
  if (typeof bot?.sendLog === 'function') bot.sendLog(text);
}

async function finish(node, helpers, ok, fields) {
  helpers.memo.set(`${node.id}:success`, Boolean(ok));
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      helpers.memo.set(`${node.id}:${key}`, value);
    }
  }
  await helpers.traverse(node, ok ? 'exec' : 'exec_failed');
}

module.exports = {
  FACES,
  blockName,
  blockAge,
  isBotMethod,
  coordsOf,
  distanceBetween,
  inReach,
  blockAtCoords,
  gotoNear,
  gotoBlock,
  clampCount,
  report,
  finish,
};
