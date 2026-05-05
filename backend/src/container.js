const { createContainer, asClass, asValue, asFunction } = require('awilix');
const prisma = require('./lib/prisma');
const config = require('./config');

// Repositories
const BotRepository = require('./repositories/BotRepository');
const CommandRepository = require('./repositories/CommandRepository');
const EventGraphRepository = require('./repositories/EventGraphRepository');
const ServerRepository = require('./repositories/ServerRepository');
const UserRepository = require('./repositories/UserRepository');
const PluginRepository = require('./repositories/PluginRepository');
const PermissionRepository = require('./repositories/PermissionRepository');
const GroupRepository = require('./repositories/GroupRepository');

// Services
const CacheManager = require('./core/services/CacheManager');
const BotProcessManager = require('./core/services/BotProcessManager');
const ResourceMonitorService = require('./core/services/ResourceMonitorService');
const TelemetryService = require('./core/services/TelemetryService');
const BotLifecycleService = require('./core/services/BotLifecycleService');
const CommandExecutionService = require('./core/services/CommandExecutionService');

// Core
const EventGraphManager = require('./core/EventGraphManager');
const PluginManager = require('./core/PluginManager');
const BotManager = require('./core/BotManager');

function createLogger() {
    return {
        debug: (...args) => console.log('[DEBUG]', ...args),
        info: (...args) => console.log('[INFO]', ...args),
        warn: (...args) => console.warn('[WARN]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
    };
}

function configureContainer() {
    const container = createContainer();

    container.register({
        prisma: asValue(prisma),
        config: asValue(config),
        logger: asFunction(createLogger).singleton(),
    });

    container.register({
        botRepository: asClass(BotRepository).singleton(),
        commandRepository: asClass(CommandRepository).singleton(),
        eventGraphRepository: asClass(EventGraphRepository).singleton(),
        serverRepository: asClass(ServerRepository).singleton(),
        userRepository: asClass(UserRepository).singleton(),
        pluginRepository: asClass(PluginRepository).singleton(),
        permissionRepository: asClass(PermissionRepository).singleton(),
        groupRepository: asClass(GroupRepository).singleton(),
    });

    container.register({
        cacheManager: asClass(CacheManager).singleton(),
        botProcessManager: asClass(BotProcessManager).singleton(),
        resourceMonitorService: asClass(ResourceMonitorService).singleton(),
        telemetryService: asClass(TelemetryService).singleton(),
    });

    container.register({
        botLifecycleService: asClass(BotLifecycleService).singleton(),
        commandExecutionService: asClass(CommandExecutionService).singleton(),
    });

    container.register({
        pluginManager: asClass(PluginManager).singleton(),
        eventGraphManager: asClass(EventGraphManager).singleton(),
    });

    container.register({
        botManager: asClass(BotManager).singleton(),
    });

    return container;
}

module.exports = configureContainer;
