const express = require('express');
const { authenticate } = require('../middleware/auth');
const os = require('os');
const pidusage = require('pidusage');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter for health check endpoint: max 5 requests per minute per IP
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// Rate limiter for stats endpoint: max 5 requests per minute per IP
const statsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

const serverStartTime = Date.now();

/**
 * Вычисляет системное использование CPU на основе средней загрузки
 * Избегает состояния гонки, не используя глобальное состояние
 */
function getSystemCpuUsage() {
    // Используем среднюю загрузку системы за 1 минуту
    const loadAvg = os.loadavg()[0]; // 1-минутное среднее
    const cpuCount = os.cpus().length;
    // Конвертируем в процент (loadAvg / cpuCount * 100)
    const cpuPercentage = Math.round((loadAvg / cpuCount) * 100);
    return Math.max(0, Math.min(100, cpuPercentage));
}

/**
 * @route GET /api/system/health
 * @desc Получить информацию о здоровье системы
 * @access Требуется авторизация
 */
router.get('/health', healthLimiter, authenticate, async (req, res) => {
    try {
        const uptime = process.uptime();
        const serverUptime = (Date.now() - serverStartTime) / 1000;
        
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        const cpus = os.cpus();
        
        const systemCpuUsage = getSystemCpuUsage();
        
        let panelCpu = 0;
        let panelMemory = 0;
        try {
            const stats = await pidusage(process.pid);
            panelCpu = parseFloat(stats.cpu.toFixed(1));
            panelMemory = parseFloat((stats.memory / 1024 / 1024).toFixed(1)); // MB
        } catch (error) {
            console.error('Ошибка получения статистики процесса:', error);
        }
        
        const platform = process.platform;
        const arch = process.arch;
        
        const platformName = {
            'win32': 'Windows',
            'linux': 'Linux',
            'darwin': 'macOS',
            'freebsd': 'FreeBSD',
            'openbsd': 'OpenBSD',
            'aix': 'AIX'
        }[platform] || platform;
        
        // Форматируем uptime
        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            if (days > 0) return `${days}д ${hours}ч`;
            if (hours > 0) return `${hours}ч ${minutes}м`;
            return `${minutes}м`;
        };

        let websocketStatus = true;
        let databaseStatus = true;
        
        try {
            const prisma = req.app.get('prisma') || require('../../lib/prisma');
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            databaseStatus = false;
        }
        
        try {
            const botManager = req.app.get('botManager');
            websocketStatus = botManager !== null && botManager !== undefined;
        } catch (error) {
            websocketStatus = false;
        }

        res.json({
            status: 'ok',
            uptime: formatUptime(serverUptime),
            uptimeSeconds: Math.floor(serverUptime),
            processUptime: formatUptime(uptime),
            memory: {
                total: Math.round(totalMemory / 1024 / 1024), // MB
                free: Math.round(freeMemory / 1024 / 1024), // MB
                used: Math.round(usedMemory / 1024 / 1024), // MB
                usedPercent: Math.round((usedMemory / totalMemory) * 100),
                panel: panelMemory // Память используемая панелью
            },
            cpu: {
                cores: cpus.length,
                model: cpus[0]?.model || 'Unknown',
                usage: systemCpuUsage,
                panelUsage: panelCpu,
                loadAverage: os.loadavg()
            },
            platform: platformName,
            platformRaw: platform,
            arch: arch,
            osRelease: os.release(),
            hostname: os.hostname(),
            nodeVersion: process.version,
            services: {
                panel: true,
                websocket: websocketStatus,
                database: databaseStatus
            }
        });
    } catch (error) {
        console.error('Error getting system health:', error);
        res.status(500).json({ 
            error: 'Failed to get system health',
            message: error.message 
        });
    }
});

/**
 * @route GET /api/system/stats
 * @desc Получить статистику системы
 * @access Требуется авторизация
 */
router.get('/stats', statsLimiter, authenticate, async (req, res) => {
    try {
        const prisma = req.app.get('prisma') || require('../../lib/prisma');
        
        const totalBots = await prisma.bot.count();
        const totalServers = await prisma.server.count();
        const totalUsers = await prisma.panelUser.count();
        
        const botManager = req.app.get('botManager');
        let runningBots = 0;
        
        if (botManager && botManager.bots) {
            runningBots = Array.from(botManager.bots.values())
                .filter(bot => typeof bot.isRunning === 'function' && bot.isRunning())
                .length;
        }
        
        res.json({
            bots: {
                total: totalBots,
                running: runningBots,
                stopped: totalBots - runningBots
            },
            servers: totalServers,
            users: totalUsers
        });
    } catch (error) {
        console.error('Error getting system stats:', error);
        res.status(500).json({ 
            error: 'Failed to get system stats',
            message: error.message 
        });
    }
});

module.exports = router;

