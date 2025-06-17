#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const config = require('./src/config.js'); 
const { startServer } = require('./src/server.js');

const DATA_DIR = path.join(os.homedir(), '.blockmine');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

process.env.DATABASE_URL = `file:${path.join(DATA_DIR, 'blockmine.db')}`;

function runCommand(command) {
    try {
        console.log(`> ${command}`);
        execSync(command, { stdio: 'inherit', cwd: __dirname });
    } catch (e) {
        console.error(`Команда "${command}" не удалась:`, e);
        process.exit(1);
    }
}

async function main() {
    console.log('Запуск панели управления BlockMine...');

    const dbPath = path.join(DATA_DIR, 'blockmine.db');
    if (!fs.existsSync(dbPath)) {
        console.log('База данных не найдена. Создаем и применяем все миграции...');
        runCommand(`npx prisma migrate deploy`);
        console.log('Заполнение базы данных начальными данными (серверами)...');
        runCommand(`npx prisma db seed`);
        console.log('Первоначальная настройка базы данных завершена.');
    } else {
        console.log('Проверка и применение обновлений базы данных...');
        runCommand(`npx prisma migrate deploy`);
        console.log('База данных в актуальном состоянии.');
    }

    await startServer();
}

if (require.main === module) {
    main().catch(e => {
        console.error('Критическая ошибка при запуске:', e);
        process.exit(1);
    });
}

module.exports = { main };