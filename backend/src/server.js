const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const prisma = require('./lib/prisma');

const config = require('./config');
const { initializeSocket } = require('./real-time/socketHandler');
const { botManager, pluginManager } = require('./core/services');

const botRoutes = require('./api/routes/bots');
const pluginRoutes = require('./api/routes/plugins');
const serverRoutes = require('./api/routes/servers');
const permissionsRoutes = require('./api/routes/permissions');
const taskRoutes = require('./api/routes/tasks');
const { router: authRoutes, ALL_PERMISSIONS, VIEWER_PERMISSIONS } = require('./api/routes/auth');
const searchRoutes = require('./api/routes/search');
const eventGraphsRouter = require('./api/routes/eventGraphs');
const TaskScheduler = require('./core/TaskScheduler');
const panelRoutes = require('./api/routes/panel');
const changelogRoutes = require('./api/routes/changelog');
const logsRoutes = require('./api/routes/logs');
const systemRoutes = require('./api/routes/system');

const app = express();
const server = http.createServer(app);

initializeSocket(server); 

app.set('botManager', botManager);
app.set('pluginManager', pluginManager);

const PORT = config.server.port;
const HOST = config.server.host;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use('/api/search', searchRoutes);
app.use('/api/panel', panelRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/system', systemRoutes);

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

async function runStartupMigrations() {
    try {
        const adminRole = await prisma.panelRole.findUnique({ where: { name: 'Admin' } });
        if (adminRole) {
            const permissions = JSON.parse(adminRole.permissions);
            if (permissions.includes('*')) {
                const newPermissions = ALL_PERMISSIONS
                    .map(p => p.id)
                    .filter(id => id !== '*');
                
                await prisma.panelRole.update({
                    where: { id: adminRole.id },
                    data: { permissions: JSON.stringify(newPermissions) }
                });
            }
        }

        // Создаем/обновляем роль Viewer
        const viewerRole = await prisma.panelRole.upsert({
            where: { name: 'Viewer' },
            update: { permissions: JSON.stringify(VIEWER_PERMISSIONS) },
            create: { name: 'Viewer', permissions: JSON.stringify(VIEWER_PERMISSIONS) }
        });

        const rootUser = await prisma.panelUser.findUnique({ where: { id: 1 }, include: { role: true } });
        if (rootUser && rootUser.role) {
            const allPermissions = ALL_PERMISSIONS.map(p => p.id).filter(id => id !== '*');
            const currentPermissions = JSON.parse(rootUser.role.permissions);

            if (JSON.stringify(allPermissions.sort()) !== JSON.stringify(currentPermissions.sort())) {
                 await prisma.panelRole.update({
                    where: { id: rootUser.role.id },
                    data: { permissions: JSON.stringify(allPermissions) }
                });
                console.log(`[Migration] Права для root-пользователя "${rootUser.username}" (ID: 1) были синхронизированы.`);
            }
        }
    } catch (error) {
        console.error('[Migration] Ошибка во время миграции прав:', error);
    }
}

async function startServer() {
    await runStartupMigrations();
    return new Promise((resolve) => {
        server.listen(PORT, HOST, async () => {
            console.log(`\nBackend сервер успешно запущен на http://${HOST}:${PORT}`);

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


const gracefulShutdown = async (signal) => {
    console.log(`[Shutdown] Получен сигнал ${signal}. Начинаем корректное завершение...`);

    TaskScheduler.shutdown();

    const botIds = Array.from(botManager.bots.keys());
    if (botIds.length > 0) {
        console.log(`[Shutdown] Остановка ${botIds.length} активных ботов...`);
        await Promise.all(botIds.map(botId => botManager.stopBot(botId)));
        console.log('[Shutdown] Все боты остановлены.');
    }

    const io = require('./real-time/socketHandler').getIO();
    if (io) {
        io.close(async () => {
            console.log('[Shutdown] WebSocket сервер закрыт.');
            
            await new Promise(resolve => server.close(resolve));
            console.log('[Shutdown] HTTP сервер закрыт.');

            const prisma = require('./lib/prisma');
            await prisma.$disconnect();
            console.log('[Shutdown] Соединение с БД закрыто.');

            console.log('[Shutdown] Корректное завершение выполнено.');
            process.exit(0);
        });
    }
};

process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2 (nodemon)'));
process.on('SIGINT', () => gracefulShutdown('SIGINT (Ctrl+C)'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));


module.exports = { startServer, app, server };

if (require.main === module) {
    startServer();
}