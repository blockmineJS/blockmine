const EventEmitter = require('events');
const { attachPathfinder, walkingMovements } = require('../attachPathfinder');

describe('attachPathfinder', () => {
  it('подключает pathfinder, когда реестр блоков готов', () => {
    const bot = new EventEmitter();
    bot.loadPlugin = jest.fn();
    attachPathfinder(bot);
    bot.emit('inject_allowed');
    expect(bot.loadPlugin).toHaveBeenCalledTimes(1);
    expect(typeof bot.loadPlugin.mock.calls[0][0]).toBe('function');
  });

  it('не подключает pathfinder второй раз', () => {
    const bot = new EventEmitter();
    bot.pathfinder = {};
    bot.loadPlugin = jest.fn();
    attachPathfinder(bot);
    bot.emit('inject_allowed');
    expect(bot.loadPlugin).not.toHaveBeenCalled();
  });

  it('ходит без копания и без установки блоков', () => {
    class FakeMovements {
      constructor() {
        this.canDig = true;
        this.scafoldingBlocks = [1, 2];
      }
    }
    const movements = walkingMovements({}, FakeMovements);
    expect(movements.canDig).toBe(false);
    expect(movements.scafoldingBlocks).toEqual([]);
  });

  it('оставляет бота живым, если плагин не встал', () => {
    const bot = new EventEmitter();
    bot.loadPlugin = jest.fn(() => {
      throw new Error('no registry');
    });
    const lines = [];
    attachPathfinder(bot, (line) => lines.push(line));
    expect(() => bot.emit('inject_allowed')).not.toThrow();
    expect(lines[0]).toContain('no registry');
  });
});
