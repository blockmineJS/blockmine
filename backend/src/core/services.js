const configureContainer = require('../container');

const container = configureContainer();

const botManager = container.resolve('botManager');
const pluginManager = container.resolve('pluginManager');
const eventGraphManager = container.resolve('eventGraphManager');

eventGraphManager.setBotManager(botManager);
botManager.initialize();

module.exports = {
    botManager,
    pluginManager,
    container
};
