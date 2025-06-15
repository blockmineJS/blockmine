const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.blockmine');
if (!fs.existsSync(DATA_DIR)) {
    console.log(`[Server] Создание папки для данных: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

process.env.DATABASE_URL = `file:${path.join(DATA_DIR, 'blockmine.db')}`;

const { initializeSocket } = require('./real-time/socketHandler');
const botRoutes = require('./api/routes/bots');
const pluginRoutes = require('./api/routes/plugins');
const serverRoutes = require('./api/routes/servers');
const permissionsRoutes = require('./api/routes/permissions');
const BotManager = require('./core/BotManager');

const app = express();
const server = http.createServer(app);

initializeSocket(server);

const PORT = process.env.PORT || 3001;

app.use(express.json());

const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
const rootPath = path.join(__dirname, '..', '..');

app.get('/api/version', async (req, res) => {
    try {
        const packageJsonPath = path.join(rootPath, 'package.json');
        const packageJsonData = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const { version } = JSON.parse(packageJsonData);
        res.json({ version });
    } catch (error) {
        console.error("Failed to read app version:", error);
        res.status(500).json({ error: 'Could not retrieve app version.' });
    }
});

app.use('/api/bots', botRoutes);
app.use('/api/plugins', pluginRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/permissions', permissionsRoutes);

app.use(express.static(frontendPath));

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err && !res.headersSent) {
            console.error(`Ошибка при отправке index.html для пути ${req.path}:`, err);
            res.status(500).send("Не удалось загрузить приложение.");
        }
    });
});

async function startServer() {
    return new Promise((resolve) => {
        server.listen(PORT, () => {
            console.log(`Backend сервер успешно запущен на http://localhost:${PORT}`);
            console.log(`Панель управления доступна по адресу: http://localhost:${PORT}`);
            resolve(server);
        });
    });
}


const gracefulShutdown = (signal) => {
    console.log(`[Shutdown] Получен сигнал ${signal}. Начинаем завершение...`);
    
    const botIds = Array.from(BotManager.bots.keys());
    if (botIds.length > 0) {
        console.log(`[Shutdown] Остановка ${botIds.length} активных ботов...`);
        for (const botId of botIds) {
            BotManager.stopBot(botId);
        }
    }

    server.close(() => {
        console.log('[Shutdown] HTTP сервер закрыт. Завершение процесса.');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('[Shutdown] Не удалось закрыть соединения вовремя, принудительное завершение.');
        process.exit(1);
    }, 5000);
};

process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2 (nodemon)'));
process.on('SIGINT', () => gracefulShutdown('SIGINT (Ctrl+C)'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));


module.exports = { startServer, app, server };

if (require.main === module) {
    startServer();
}

