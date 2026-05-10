#!/usr/bin/env node
/**
 * Postinstall script для blockmine
 * Устанавливает зеркало Prisma для РФ и запускает установку
 */

const { execSync } = require('child_process');

// Устанавливаем зеркало Prisma для РФ (если не установлено вручную)
if (!process.env.PRISMA_ENGINES_MIRROR) {
    process.env.PRISMA_ENGINES_MIRROR = 'https://registry.npmmirror.com/-/binary/prisma/';
}
if (!process.env.PRISMA_BINARIES_MIRROR) {
    process.env.PRISMA_BINARIES_MIRROR = 'https://registry.npmmirror.com/-/binary/prisma/';
}

console.log('[BlockMine] Running postinstall...');

try {
    // Устанавливаем frontend зависимости без скриптов
    console.log('[BlockMine] Installing frontend dependencies...');
    execSync('npm install --workspace=frontend --ignore-scripts', {
        stdio: 'inherit',
        env: process.env
    });

    // Генерируем Prisma клиент с зеркалом
    console.log('[BlockMine] Generating Prisma client...');
    execSync('prisma generate --schema=./backend/prisma/schema.prisma', {
        stdio: 'inherit',
        env: process.env
    });

    console.log('[BlockMine] Postinstall completed successfully!');
} catch (error) {
    console.error('[BlockMine] Postinstall failed:', error.message);
    process.exit(1);
}
