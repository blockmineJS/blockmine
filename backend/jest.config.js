module.exports = {
    testEnvironment: 'node',

    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/?(*.)+(spec|test).js'
    ],

    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
        '/storage/',
        '/plugins/'
    ],

    modulePathIgnorePatterns: [
        '/storage/',
        '/plugins/'
    ],

    collectCoverageFrom: [
        // Repositories (98.79% coverage)
        'src/repositories/**/*.js',

        // Services (refactored)
        'src/core/services/**/*.js',

        // Core files
        'src/container.js',
        'src/core/BotManager.js',
        'src/core/EventGraphManager.js',
        'src/core/PluginManager.js',
        'src/core/UserService.js',
        'src/core/DependencyService.js',
        'src/core/TaskScheduler.js',
        'src/core/PluginLoader.js',
        'src/core/PluginService.js',
        'src/core/PermissionManager.js',
        'src/core/MessageQueue.js',
        'src/core/GraphExecutionEngine.js',
        'src/core/NodeRegistry.js',

        // API Routes
        'src/api/routes/**/*.js',

        // Utilities
        'src/core/utils/**/*.js',

        // Exclude
        '!src/**/*.test.js',
        '!src/**/__tests__/**',
        '!src/core/BotProcess.js',  // Child process - сложно тестировать
        '!src/core/BotManager.old.js',  // Старый файл
        '!src/test-refactor.js',  // Скрипт для проверки
    ],


    testTimeout: 10000,

    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,

    verbose: true,

    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
};
