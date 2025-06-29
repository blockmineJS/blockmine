const BotManager = require('./BotManager');
const PluginManager = require('./PluginManager');

const botManager = new BotManager();
const pluginManager = new PluginManager(botManager);

botManager.initialize();

module.exports = {
    botManager,
    pluginManager
}; 