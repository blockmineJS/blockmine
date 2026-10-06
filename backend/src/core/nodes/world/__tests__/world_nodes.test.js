const registry = require('../../../NodeRegistry');
const { execute: findBlock } = require('../find_block');
const { execute: dig } = require('../dig');
const { execute: place } = require('../place');
const { execute: attack } = require('../attack');

function run(execute, node, context) {
  const memo = new Map();
  const traversed = [];
  const helpers = {
    memo,
    resolvePinValue: async (current, pinId, fallback) => {
      if (current.data && Object.prototype.hasOwnProperty.call(current.data, pinId) && current.data[pinId] !== undefined) {
        return current.data[pinId];
      }
      return fallback;
    },
    traverse: async (_node, pin) => {
      traversed.push(pin);
    },
  };
  return execute(node, context, helpers).then(() => ({ memo, traversed }));
}

function position(x, y, z) {
  return {
    x,
    y,
    z,
    offset(dx, dy, dz) {
      return { x: x + dx, y: y + dy, z: z + dz };
    },
  };
}

describe('world nodes', () => {
  it('регистрирует ноды мира и шаг', () => {
    expect(registry.hasNodeType('world:find_block')).toBe(true);
    expect(registry.hasNodeType('world:dig')).toBe(true);
    expect(registry.hasNodeType('world:place')).toBe(true);
    expect(registry.hasNodeType('world:attack')).toBe(true);
    expect(registry.hasNodeType('navigation:step')).toBe(true);
    const face = registry.getNodeConfig('world:place').getInputs().find((pin) => pin.id === 'face');
    expect(face.inlineFieldOptions.map((option) => option.value)).toEqual(['up', 'down', 'north', 'south', 'east', 'west']);
  });

  it('находит спелую пшеницу и пропускает молодую', async () => {
    const wheat = {
      name: 'wheat',
      position: { x: 3, y: 64, z: 4 },
      getProperties: () => ({ age: '7' }),
    };
    const bot = {
      findBlocks: jest.fn(() => [wheat.position]),
      blockAt: jest.fn(() => wheat),
    };
    const result = await run(findBlock, {
      id: 'find',
      data: { name: 'minecraft:wheat', radius: 16, count: 1, minAge: 7 },
    }, { bot });

    const matching = bot.findBlocks.mock.calls[0][0].matching;
    expect(matching({ name: 'wheat', getProperties: () => ({ age: 7 }) })).toBe(true);
    expect(matching({ name: 'wheat', getProperties: () => ({ age: 3 }) })).toBe(false);
    expect(matching({ name: 'carrots', getProperties: () => ({ age: 7 }) })).toBe(false);
    expect(result.traversed).toEqual(['exec']);
    expect(result.memo.get('find:block')).toEqual({ x: 3, y: 64, z: 4, name: 'wheat', age: 7 });
  });

  it('ломает блок рядом и подходит, если он далеко', async () => {
    const block = { name: 'wheat', diggable: true, position: { x: 8, y: 64, z: 0 } };
    let near = false;
    const digBlock = jest.fn(async () => {});
    const bot = {
      entity: { position: position(0, 64, 0) },
      blockAt: jest.fn(() => block),
      canDigBlock: jest.fn(() => near),
      dig: digBlock,
      pathfinder: {
        goto: jest.fn(async () => {
          near = true;
        }),
      },
    };

    const result = await run(dig, {
      id: 'dig',
      data: { block: { x: 8, y: 64, z: 0 } },
    }, { bot });

    expect(bot.pathfinder.goto).toHaveBeenCalledTimes(1);
    expect(digBlock).toHaveBeenCalledWith(block, true);
    expect(result.traversed).toEqual(['exec']);
  });

  it('ставит семена на верхнюю грань', async () => {
    const reference = { name: 'farmland', position: { x: 0, y: 63, z: 0 } };
    const item = { name: 'wheat_seeds' };
    const placeBlock = jest.fn(async () => {});
    const bot = {
      entity: { position: position(0, 64, 0) },
      blockAt: jest.fn(() => reference),
      inventory: { items: () => [item] },
      equip: jest.fn(async () => {}),
      placeBlock,
    };

    const result = await run(place, {
      id: 'place',
      data: { x: 0, y: 63, z: 0, face: 'up', itemName: 'wheat_seeds' },
    }, { bot });

    expect(bot.equip).toHaveBeenCalledWith(item, 'hand');
    expect(placeBlock).toHaveBeenCalledWith(reference, expect.objectContaining({ x: 0, y: 1, z: 0 }));
    expect(result.memo.get('place:y')).toBe(64);
    expect(result.traversed).toEqual(['exec']);
  });

  it('бьёт сущность рядом и не идёт к ней', async () => {
    const target = { id: 5, position: { x: 1, y: 64, z: 0 } };
    const attackEntity = jest.fn();
    const bot = {
      entity: { position: position(0, 64, 0) },
      entities: { 5: target },
      attack: attackEntity,
      pathfinder: { goto: jest.fn() },
    };

    const result = await run(attack, {
      id: 'hit',
      data: { entity: { id: 5 } },
    }, { bot });

    expect(bot.pathfinder.goto).not.toHaveBeenCalled();
    expect(attackEntity).toHaveBeenCalledWith(target);
    expect(result.traversed).toEqual(['exec']);
  });

  it('подходит к дальней сущности и бьёт её', async () => {
    const target = { id: 9, position: { x: 12, y: 64, z: 0 } };
    const bot = {
      entity: { position: position(0, 64, 0) },
      entities: { 9: target },
      attack: jest.fn(),
      pathfinder: {
        goto: jest.fn(async () => {
          bot.entity.position = position(12, 64, 0);
        }),
      },
    };

    const result = await run(attack, {
      id: 'hit',
      data: { entity: { id: 9 } },
    }, { bot });

    expect(bot.pathfinder.goto).toHaveBeenCalledTimes(1);
    expect(bot.attack).toHaveBeenCalledWith(target);
    expect(result.traversed).toEqual(['exec']);
  });
});
