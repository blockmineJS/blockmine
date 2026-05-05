const { Vec3 } = require('vec3');

function createBotApi(bot, options = {}) {
  const { enableLogging = false } = options;

  return {
    sendMessage(chatType, messageText, recipient) {
      if (!bot || !bot.messageQueue) {
        if (enableLogging) {
          log('[BotApi] Bot not ready for sendMessage');
        }
        return;
      }
      bot.messageQueue.enqueue(chatType, messageText, recipient);
    },

    executeCommand(command) {
      if (!bot || !bot.messageQueue) {
        if (enableLogging) {
          log('[BotApi] Bot not ready for executeCommand');
        }
        return;
      }
      bot.messageQueue.enqueue('command', command);
    },

    async lookAt(x, y, z) {
      if (!bot) return;
      const target = new Vec3(x, y, z);
      await bot.lookAt(target);
    },

    async navigate(x, y, z) {
      if (!bot || !bot.pathfinder) return;
      const GoalBlock = require('mineflayer-pathfinder').goals.GoalBlock;
      const goal = new GoalBlock(x, y, z);
      await bot.pathfinder.goto(goal);
    },

    attack(entityId) {
      if (!bot) return;
      const entity = bot.entities[entityId];
      if (entity) bot.attack(entity);
    },

    follow(username) {
      if (!bot || !bot.pathfinder) return;
      const player = bot.players[username];
      if (player && player.entity) {
        const GoalFollow = require('mineflayer-pathfinder').goals.GoalFollow;
        const goal = new GoalFollow(player.entity, 3);
        bot.pathfinder.setGoal(goal, true);
      }
    },

    stopFollow() {
      if (bot && bot.pathfinder) {
        bot.pathfinder.setGoal(null);
      }
    },
  };
}

function log(message) {
  if (process.send) {
    process.send({ type: 'log', content: message });
  } else {
    console.log(message);
  }
}

module.exports = { createBotApi };
