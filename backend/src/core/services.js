const { asValue } = require('awilix');
const configureContainer = require('../container');

const container = configureContainer();

const BotManager = require('./BotManager');
const botManager = new BotManager(container.cradle);

// Регистрируем botManager в контейнере для PluginManager
container.register({
    botManager: asValue(botManager)
});

const pluginManager = container.resolve('pluginManager');
const eventGraphManager = container.resolve('eventGraphManager');

// EventGraphManager требует botManager через setter из-за циклической зависимости
eventGraphManager.setBotManager(botManager);

botManager.initialize();

module.exports = {
    botManager,
    pluginManager,
    container
};
