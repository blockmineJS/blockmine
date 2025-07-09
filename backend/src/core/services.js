const botManager = require('./BotManager');
const PluginManager = require('./PluginManager');

const pluginManager = new PluginManager(botManager);

botManager.initialize();

module.exports = {
    botManager,
    pluginManager
}; 