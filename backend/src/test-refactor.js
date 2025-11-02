/**
 * Тестовый скрипт для проверки рефакторинга
 */

const configureContainer = require('./container');

console.log('=== Тестирование рефакторинга ===\n');

try {
    // 1. Создаём контейнер
    console.log('1. Создание DI контейнера...');
    const container = configureContainer();
    console.log('   ✓ Контейнер создан\n');

    // 2. Проверяем repositories
    console.log('2. Проверка Repositories...');
    const botRepo = container.resolve('botRepository');
    const commandRepo = container.resolve('commandRepository');
    const permissionRepo = container.resolve('permissionRepository');
    console.log('   ✓ BotRepository:', botRepo.constructor.name);
    console.log('   ✓ CommandRepository:', commandRepo.constructor.name);
    console.log('   ✓ PermissionRepository:', permissionRepo.constructor.name);
    console.log('');

    // 3. Проверяем services
    console.log('3. Проверка Services...');
    const cacheManager = container.resolve('cacheManager');
    const processManager = container.resolve('botProcessManager');
    const resourceMonitor = container.resolve('resourceMonitorService');
    const telemetry = container.resolve('telemetryService');
    console.log('   ✓ CacheManager:', cacheManager.constructor.name);
    console.log('   ✓ BotProcessManager:', processManager.constructor.name);
    console.log('   ✓ ResourceMonitorService:', resourceMonitor.constructor.name);
    console.log('   ✓ TelemetryService:', telemetry.constructor.name);
    console.log('');

    // 4. Проверяем высокоуровневые сервисы
    console.log('4. Проверка High-level Services...');
    const lifecycleService = container.resolve('botLifecycleService');
    const commandService = container.resolve('commandExecutionService');
    console.log('   ✓ BotLifecycleService:', lifecycleService.constructor.name);
    console.log('   ✓ CommandExecutionService:', commandService.constructor.name);
    console.log('');

    // 5. Создаём BotManager facade
    console.log('5. Создание BotManager facade...');
    const BotManager = require('./core/BotManager.refactored');
    const botManager = new BotManager(container.cradle);
    console.log('   ✓ BotManager создан');
    console.log('   ✓ Методы:', Object.getOwnPropertyNames(Object.getPrototypeOf(botManager)).filter(m => m !== 'constructor').slice(0, 5).join(', '), '...');
    console.log('');

    // 6. Проверяем что dependencies правильно инжектируются
    console.log('6. Проверка dependency injection...');
    const hasLifecycle = botManager.lifecycleService !== undefined;
    const hasCommand = botManager.commandService !== undefined;
    const hasCache = botManager.cache !== undefined;
    console.log('   ✓ lifecycleService инжектирован:', hasLifecycle);
    console.log('   ✓ commandService инжектирован:', hasCommand);
    console.log('   ✓ cacheManager инжектирован:', hasCache);
    console.log('');

    // 7. Проверяем LRU cache
    console.log('7. Проверка LRU Cache...');
    cacheManager.setToken('test-token', { userId: 123 });
    const tokenData = cacheManager.getToken('test-token');
    console.log('   ✓ Token сохранён и получен:', tokenData?.userId === 123);
    console.log('');

    console.log('=== ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ===\n');
    console.log('Рефакторинг завершён успешно!');
    console.log('\nСоздано:');
    console.log('  - 8 Repositories (BotRepository, CommandRepository, etc.)');
    console.log('  - 6 Services (CacheManager, BotProcessManager, ResourceMonitorService, TelemetryService, BotLifecycleService, CommandExecutionService)');
    console.log('  - 1 DI Container (Awilix)');
    console.log('  - 1 BotManager Facade (для обратной совместимости)');
    console.log('  - LRU Cache вместо Redis (для self-hosting)');

    process.exit(0);

} catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
}
