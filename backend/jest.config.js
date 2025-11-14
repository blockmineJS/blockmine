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
        'src/repositories/**/*.js',
        'src/core/services/**/*.js',
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
        'src/core/PrismaService.js',
        'src/api/routes/**/*.js',
        'src/core/utils/**/*.js',
        'src/core/nodes/**/*.js',
        '!src/**/*.test.js',
        '!src/**/__tests__/**',
        '!src/core/BotProcess.js',
        '!src/core/BotManager.old.js',
        '!src/test-refactor.js',
    ],


    testTimeout: 10000,

    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,

    verbose: true,

    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
};
