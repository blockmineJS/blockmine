const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const config = require('./config'); 
const { initializeSocket } = require('./real-time/socketHandler');
const { botManager } = require('./core/services');

// --- НАЧАЛО БЛОКА ИЗМЕНЕНИЙ ---

// 2. Импортируем остальные модули, которые от него зависят
const botRoutes = require('./api/routes/bots');
const pluginRoutes = require('./api/routes/plugins');
const serverRoutes = require('./api/routes/servers');
const permissionsRoutes = require('./api/routes/permissions');
const taskRoutes = require('./api/routes/tasks');
const authRoutes = require('./api/routes/auth');
const searchRoutes = require('./api/routes/search');
const eventGraphsRouter = require('./api/routes/eventGraphs');
const TaskScheduler = require('./core/TaskScheduler');
const panelRoutes = require('./api/routes/panel');

// --- КОНЕЦ БЛОКА ИЗМЕНЕНИЙ ---

const app = express();
const server = http.createServer(app);

initializeSocket(server); 

const PORT = config.server.port;
const HOST = config.server.host;

app.use(express.json());

const frontendPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const rootPath = path.resolve(__dirname, '..', '..');

app.use('/api/auth', authRoutes);

app.use('/api/version', (req, res, next) => {
    async function getVersion() {
        try {
            const packageJsonPath = path.join(rootPath, 'package.json');
            const packageJsonData = await fs.promises.readFile(packageJsonPath, 'utf-8');
            const { version } = JSON.parse(packageJsonData);
            res.json({ version });
        } catch (error) {
            console.error("Failed to read app version:", error);
            res.status(500).json({ error: 'Could not retrieve app version.' });
        }
    }
    getVersion();
});
app.use('/api/tasks', taskRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/plugins', pluginRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/panel', panelRoutes);

app.use(express.static(frontendPath));

app.get(/^(?!\/api).*/, (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error(`Критическая ошибка: файл index.html не найден по пути ${indexPath}`);
        res.status(404).send(
            '<h1>Файлы фронтенда не найдены! Соберите фронтенд командой "npm run build --workspace=frontend"</h1>'
        );
    }
});

async function startServer() {
    return new Promise((resolve) => {
        server.listen(PORT, HOST, async () => {
            console.log(`\nBackend сервер успешно запущен на http://${HOST}:${PORT}`);

            botManager.initialize();
            
            if (HOST === '0.0.0.0') {
                const networkInterfaces = os.networkInterfaces();
                console.log('Панель управления доступна по следующим адресам:');
                console.log(`  - Локально: http://localhost:${PORT}`);
                Object.keys(networkInterfaces).forEach(ifaceName => {
                    networkInterfaces[ifaceName].forEach(iface => {
                        if (iface.family === 'IPv4' && !iface.internal) {
                            console.log(`  - В сети: http://${iface.address}:${PORT}`);
                        }
                    });
                });
                console.log('  - А также по вашему внешнему IP адресу.');

            } else {
                console.log(`Панель управления доступна по адресу: http://localhost:${PORT}`);
            }
            
            await TaskScheduler.initialize();
            resolve(server);
        });
    });
}

const gracefulShutdown = (signal) => {
    console.log(`[Shutdown] Получен сигнал ${signal}. Начинаем завершение...`);
    
    const botIds = Array.from(botManager.bots.keys());
    if (botIds.length > 0) {
        console.log(`[Shutdown] Остановка ${botIds.length} активных ботов...`);
        for (const botId of botIds) {
            botManager.stopBot(botId);
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