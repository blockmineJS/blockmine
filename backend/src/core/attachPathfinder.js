const { pathfinder, Movements } = require('mineflayer-pathfinder');

function walkingMovements(bot, MovementsClass = Movements) {
  const movements = new MovementsClass(bot);
  movements.canDig = false;
  movements.scafoldingBlocks = [];
  return movements;
}

function attachPathfinder(bot, log = () => {}) {
  if (!bot || typeof bot.once !== 'function' || typeof bot.loadPlugin !== 'function') return;

  bot.once('inject_allowed', () => {
    if (bot.pathfinder) return;
    try {
      bot.loadPlugin(pathfinder);
      if (typeof bot.pathfinder?.setMovements === 'function') {
        bot.pathfinder.setMovements(walkingMovements(bot));
      }
    } catch (error) {
      log(`[Pathfinder] ${error.message}`);
    }
  });
}

module.exports = { attachPathfinder, walkingMovements };
