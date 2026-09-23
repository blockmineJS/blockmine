const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const TaskScheduler = require('../../core/TaskScheduler');
const { authenticate, authorize } = require('../middleware/auth');

const { CronExpressionParser } = require('cron-parser');
const cron = require('node-cron');

const prisma = new PrismaClient();

router.use(authenticate);

const normalizeCronPattern = (pattern) => {
    if (typeof pattern !== 'string') return '';
    return pattern.replace(/\*\/1/g, '*').replace(/\s+/g, ' ').trim();
};

const parseCronOrError = (pattern) => {
    const normalized = normalizeCronPattern(pattern);
    if (!normalized || !cron.validate(normalized)) {
        return { error: 'Невалидный cron-паттерн' };
    }
    return { pattern: normalized };
};

router.get('/', authorize('task:list'), async (req, res) => {
    try {
        const tasks = await prisma.scheduledTask.findMany({ orderBy: { createdAt: 'desc' } });
        const normalizedTasks = tasks.map(task => ({
            ...task,
            cronPattern: normalizeCronPattern(task.cronPattern),
        }));
        res.json(normalizedTasks);
    } catch (error) {
        console.error("[API /tasks] Ошибка получения списка задач:", error);
        res.status(500).json({ error: 'Не удалось получить список задач' });
    }
});

router.post('/', authorize('task:create'), async (req, res) => {
    try {
        const { runOnStartup, cronPattern, ...restOfBody } = req.body;
        const taskData = { ...restOfBody, runOnStartup: !!runOnStartup };

        if (runOnStartup) {
            taskData.cronPattern = null;
        } else {
            const parsed = parseCronOrError(cronPattern);
            if (parsed.error) {
                return res.status(400).json({ error: parsed.error });
            }
            taskData.cronPattern = parsed.pattern;
        }

        const newTask = await prisma.scheduledTask.create({ data: taskData });
        if (!runOnStartup) {
            TaskScheduler.scheduleTask(newTask);
        }
        res.status(201).json(newTask);
    } catch (error) {
        console.error("[API /tasks] Ошибка создания задачи:", error);
        res.status(500).json({ error: 'Не удалось создать задачу' });
    }
});

router.put('/:id', authorize('task:edit'), async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    try {
        const { id, createdAt, updatedAt, lastRun, ...dataToUpdate } = req.body;
        
        if (typeof dataToUpdate.runOnStartup !== 'undefined') {
            dataToUpdate.runOnStartup = !!dataToUpdate.runOnStartup;
            if (dataToUpdate.runOnStartup) {
                dataToUpdate.cronPattern = null;
            }
        }

        if (dataToUpdate.cronPattern) {
            const parsed = parseCronOrError(dataToUpdate.cronPattern);
            if (parsed.error) {
                return res.status(400).json({ error: parsed.error });
            }
            dataToUpdate.cronPattern = parsed.pattern;
        }

        const updatedTask = await prisma.scheduledTask.update({
            where: { id: taskId },
            data: dataToUpdate,
        });
        await TaskScheduler.updateTask(updatedTask);
        res.json(updatedTask);
    } catch (error) {
        console.error(`[API /tasks] Ошибка обновления задачи ${taskId}:`, error);
        res.status(500).json({ error: 'Не удалось обновить задачу' });
    }
});

router.delete('/:id', authorize('task:delete'), async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    try {
        await prisma.scheduledTask.delete({ where: { id: taskId } });
        TaskScheduler.unscheduleTask(taskId);
        res.status(204).send();
    } catch (error) {
        console.error(`[API /tasks] Ошибка удаления задачи ${taskId}:`, error);
        res.status(500).json({ error: 'Не удалось удалить задачу' });
    }
});


router.post('/describe', authorize('task:list'), (req, res) => {
    const { pattern } = req.body;

    if (!pattern) {
        return res.status(400).json({ error: 'Невалидный cron-паттерн' });
    }

    try {
        const interval = CronExpressionParser.parse(pattern);
        
        res.json({
            human: interval.stringify(true),
            next: interval.next().toDate().toLocaleString('ru-RU')
        });
    } catch (error) {
        console.error(`[API /tasks/describe] Ошибка парсинга паттерна "${pattern}":`, error.message);
        res.status(500).json({ error: 'Ошибка парсинга паттерна' });
    }
});

module.exports = router;