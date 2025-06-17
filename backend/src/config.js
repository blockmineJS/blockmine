const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

let config = null;

function generateInitialConfig() {
    console.log('[Config] Файл конфигурации не найден. Генерируем новый...');

    const isLinux = process.platform === 'linux';
    
    const newConfig = {
        server: {
            host: isLinux ? '0.0.0.0' : '127.0.0.1',
            port: 3001,
            allowExternalAccess: isLinux,
        },
        security: {
            jwtSecret: crypto.randomBytes(64).toString('hex'),
            encryptionKey: crypto.randomBytes(32).toString('hex'),
            adminRecoveryCode: `bmr-${crypto.randomBytes(12).toString('hex')}`
        },
        telemetry: {
            enabled: true
        }
    };

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    
    console.log('================================================================');
    console.log('ВАЖНО: Конфигурация сгенерирована!');
    console.log(`Файл сохранен в: ${CONFIG_PATH}`);
    
    if (isLinux) {
        console.log('\n[Linux] Обнаружена система Linux. Внешний доступ к панели включен по умолчанию.');
        console.log('Просмотр панели будет доступен с внешнего IP адреса вашего сервера.');
        console.log(`Чтобы отключить это, измените "allowExternalAccess" на false в файле конфигурации:`);
        console.log(CONFIG_PATH);
    }
    
    console.log('\nПожалуйста, сохраните этот код восстановления в безопасном месте.');
    console.log('Он понадобится для сброса пароля администратора.');
    console.log(`\n    Код восстановления: ${newConfig.security.adminRecoveryCode}\n`);
    console.log('================================================================');

    return newConfig;
}

function loadConfig() {
    if (config) {
        return config;
    }

    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const fileContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
            config = JSON.parse(fileContent);
            console.log(`[Config] Конфигурация успешно загружена из ${CONFIG_PATH}`);
        } else {
            config = generateInitialConfig();
        }
    } catch (error) {
        console.error('[Config] КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить или создать файл конфигурации.', error);
        process.exit(1);
    }
    
    return config;
}

module.exports = loadConfig();