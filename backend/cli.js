#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { startServer } = require('./src/server.js');

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

function runCommand(command) {
    try {
        console.log(`> ${command}`);
        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
        execSync(command, { stdio: 'inherit', cwd: __dirname, shell: shell });
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
        runCommand(`npx prisma migrate deploy --schema=${prismaSchemaPath}`);
        
        console.log('Заполнение базы данных начальными данными (серверами)...');
        const seedScriptPath = path.join(__dirname, 'prisma', 'seed.js');
        runCommand(`node ${seedScriptPath}`); 

        console.log('Первоначальная настройка базы данных завершена.');
    } else {
        console.log('Проверка и применение обновлений базы данных...');
        runCommand(`npx prisma migrate deploy --schema=${prismaSchemaPath}`);
        console.log('База данных в актуальном состоянии.');
    }

    await startServer();
}

main().catch(e => {
    console.error('Критическая ошибка при запуске:', e);
    process.exit(1);
});