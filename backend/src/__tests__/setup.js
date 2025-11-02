/**
 * Jest Setup - выполняется перед всеми тестами
 */

// Мокируем логгер чтобы тесты были тихими
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Устанавливаем переменные окружения для тестов
process.env.NODE_ENV = 'test';
process.env.DEBUG = 'false';

// Mock для Prisma (если нужно)
jest.mock('../lib/prisma', () => ({
    bot: {},
    command: {},
    permission: {},
    // ... другие модели при необходимости
}));
