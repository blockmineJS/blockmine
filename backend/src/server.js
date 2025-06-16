const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

const { initializeSocket } = require('./real-time/socketHandler');
const cors = require('cors');
const authRoutes = require('./api/routes/auth');
const authMiddleware = require('./middleware/auth');
const botRoutes = require('./api/routes/bots');
const pluginRoutes = require('./api/routes/plugins');
const serverRoutes = require('./api/routes/servers');
const permissionsRoutes = require('./api/routes/permissions');
const taskRoutes = require('./api/routes/tasks');
const BotManager = require('./core/BotManager');
const TaskScheduler = require('./core/TaskScheduler');

const app = express();
const server = http.createServer(app);

initializeSocket(server);

const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes); // auth routes should be public
app.use('/api', authMiddleware); // protect other API routes


const frontendPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const rootPath = path.resolve(__dirname, '..', '..');


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

app.use('/api/tasks', taskRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/plugins', pluginRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/permissions', permissionsRoutes);



app.use(express.static(frontendPath));

app.get(/^(?!\/api).*/, (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error(`Критическая ошибка: файл index.html не найден по пути ${indexPath}`);
        res.status(404).send(
            '<h1>Файлы фронтенда не найдены!1!!!!111</h1>'
        );
    }
});

async function startServer() {
    return new Promise((resolve) => {
    server.listen(PORT, async () => {
            console.log(`Backend сервер успешно запущен на порту ${PORT}`);
            console.log(`Панель управления доступна по адресу: http://<host>:${PORT}`);
            await TaskScheduler.initialize();
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