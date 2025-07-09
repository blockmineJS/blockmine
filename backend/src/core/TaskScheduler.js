const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { botManager } = require('./services');

class TaskScheduler {
    constructor() {
        this.scheduledJobs = new Map();
        console.log('[TaskScheduler] Сервис планировщика инициализирован.');
    }

    async initialize() {
        console.log('[TaskScheduler] Загрузка и планирование задач из БД...');
        const allTasks = await prisma.scheduledTask.findMany();
        
        const tasksToSchedule = allTasks.filter(task => task.isEnabled && task.cronPattern && cron.validate(task.cronPattern));
        const tasksToRunOnStartup = allTasks.filter(task => task.isEnabled && task.runOnStartup);

        tasksToSchedule.forEach(task => {
            this.scheduleTask(task);
        });
        
        console.log(`[TaskScheduler] Запланировано ${this.scheduledJobs.size} cron-задач.`);

        if (tasksToRunOnStartup.length > 0) {
            console.log(`[TaskScheduler] Обнаружено ${tasksToRunOnStartup.length} задач для выполнения при запуске.`);
            for (const task of tasksToRunOnStartup) {
                setTimeout(() => this.executeTask(task), 2000);
            }
        }
    }

    async executeTask(task) {
        console.log(`[TaskScheduler] Выполнение задачи: "${task.name}" (ID: ${task.id})`);
        let botIds = [];
        
        try {
            const targetIds = JSON.parse(task.targetBotIds);
            if (Array.isArray(targetIds) && targetIds[0] === 'ALL') {
                const allBots = await prisma.bot.findMany({ select: { id: true } });
                botIds = allBots.map(b => b.id);
            } else {
                botIds = targetIds.map(id => parseInt(id, 10));
            }
        } catch (e) {
            console.error(`[TaskScheduler] Ошибка парсинга targetBotIds для задачи ${task.id}:`, e.message);
            return;
        }

        for (const botId of botIds) {
            try {
                const botConfig = await prisma.bot.findUnique({ where: { id: botId }, include: { server: true } });
                if (!botConfig) continue;

                switch (task.action) {
                    case 'START_BOT':
                        console.log(` -> Запуск бота ${botConfig.username}`);
                        if (!botManager.bots.has(botId)) await botManager.startBot(botConfig);
                        break;
                    case 'STOP_BOT':
                        console.log(` -> Остановка бота ${botConfig.username}`);
                        if (botManager.bots.has(botId)) botManager.stopBot(botId);
                        break;
                    case 'RESTART_BOT':
                        console.log(` -> Перезапуск бота ${botConfig.username}`);
                        if (botManager.bots.has(botId)) {
                            botManager.stopBot(botId);
                            setTimeout(() => botManager.startBot(botConfig), 5000); 
                        } else {
                            await botManager.startBot(botConfig);
                        }
                        break;
                    case 'SEND_COMMAND':
                        if (botManager.bots.has(botId)) {
                            const payload = JSON.parse(task.payload || '{}');
                            if (payload.command) {
                                console.log(` -> Отправка команды "${payload.command}" боту ${botConfig.username}`);
                                botManager.sendMessageToBot(botId, payload.command);
                            }
                        }
                        break;
                }
            } catch (error) {
                console.error(`[TaskScheduler] Ошибка выполнения действия для бота ID ${botId}:`, error);
            }
        }
        await prisma.scheduledTask.update({ where: { id: task.id }, data: { lastRun: new Date() } });
    }

    scheduleTask(task) {
        if (this.scheduledJobs.has(task.id)) {
            this.unscheduleTask(task.id);
        }

        if (!task.cronPattern || !cron.validate(task.cronPattern)) {
            if (!task.runOnStartup) {
                 console.error(`[TaskScheduler] Неверный или отсутствующий cron-паттерн для задачи ID ${task.id}: ${task.cronPattern}`);
            }
            return;
        }

        const job = cron.schedule(task.cronPattern, () => this.executeTask(task), {
            scheduled: true,
            timezone: "Europe/Moscow"
        });

        this.scheduledJobs.set(task.id, job);
        console.log(`[TaskScheduler] Задача "${task.name}" запланирована с паттерном: ${task.cronPattern}`);
    }

    unscheduleTask(taskId) {
        const job = this.scheduledJobs.get(taskId);
        if (job) {
            job.stop();
            this.scheduledJobs.delete(taskId);
            console.log(`[TaskScheduler] Задача ID ${taskId} снята с планирования.`);
        }
    }

    async updateTask(updatedTask) {
        this.unscheduleTask(updatedTask.id);
        if (updatedTask.isEnabled) {
            this.scheduleTask(updatedTask);
        }
    }

    shutdown() {
        console.log('[TaskScheduler] Остановка всех запланированных задач...');
        this.scheduledJobs.forEach(job => job.stop());
        this.scheduledJobs.clear();
        console.log('[TaskScheduler] Все задачи остановлены.');
    }
}

module.exports = new TaskScheduler();