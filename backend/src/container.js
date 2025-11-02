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

function createLogger() {
    // Пока используем консоль, позже заменим на Pino
    return {
        debug: (...args) => console.log('[DEBUG]', ...args),
        info: (...args) => console.log('[INFO]', ...args),
        warn: (...args) => console.warn('[WARN]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
    };
}

function configureContainer() {
    const container = createContainer();

    // Infrastructure
    container.register({
        prisma: asValue(prisma),
        config: asValue(config),
        logger: asFunction(createLogger).singleton(),
    });

    // Repositories
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

    // Core Services
    container.register({
        cacheManager: asClass(CacheManager).singleton(),
        botProcessManager: asClass(BotProcessManager).singleton(),
        resourceMonitorService: asClass(ResourceMonitorService).singleton(),
        telemetryService: asClass(TelemetryService).singleton(),
    });

    // Managers
    container.register({
        pluginManager: asClass(PluginManager).singleton(),
        // EventGraphManager создаётся без зависимости - botManager передаётся через setter
        eventGraphManager: asClass(EventGraphManager).singleton(),
    });

    // High-level Services (зависят от managers)
    container.register({
        botLifecycleService: asClass(BotLifecycleService).singleton(),
        commandExecutionService: asClass(CommandExecutionService).singleton(),
    });

    return container;
}

module.exports = configureContainer;
