const { z } = require('zod');
const cron = require('node-cron');
const prisma = require('../../../lib/prisma');
const TaskScheduler = require('../../../core/TaskScheduler');
const { ok, err, wrap, requirePermission, requireBotAccess, getAllowedBotIds, jsonField } = require('../helpers');

const ACTIONS = ['START_BOT', 'STOP_BOT', 'RESTART_BOT', 'SEND_COMMAND'];

function normalizeCron(pattern) {
    if (typeof pattern !== 'string') return '';
    return pattern.replace(/\*\/1/g, '*').replace(/\s+/g, ' ').trim();
}

function parseCron(pattern) {
    const normalized = normalizeCron(pattern);
    if (!normalized || !cron.validate(normalized)) return null;
    return normalized;
}

async function targetsAllowed(user, targetBotIds) {
    if (targetBotIds.includes('ALL')) {
        const allowed = await getAllowedBotIds(user.userId);
        if (allowed !== null) return err('ALL requires access to every bot');
        return null;
    }
    for (const botId of targetBotIds) {
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
    }
    return null;
}

function presentTask(task) {
    return {
        ...task,
        targetBotIds: jsonField(task.targetBotIds, []),
        payload: jsonField(task.payload, {}),
    };
}

function register(server, { user }) {
    server.registerTool('list_tasks', {
        description: 'List scheduled tasks visible to this API key.',
        inputSchema: {},
    }, wrap('list_tasks', async () => {
        const permErr = requirePermission(user, 'task:list');
        if (permErr) return permErr;
        const allowed = await getAllowedBotIds(user.userId);
        const tasks = await prisma.scheduledTask.findMany({ orderBy: { createdAt: 'desc' } });
        const visible = tasks.filter((task) => {
            const ids = jsonField(task.targetBotIds, []);
            if (!Array.isArray(ids)) return false;
            if (ids.includes('ALL')) return allowed === null;
            if (allowed === null) return true;
            return ids.every((id) => allowed.includes(id));
        });
        return ok(visible.map(presentTask));
    }));

    server.registerTool('create_task', {
        description: 'Create a scheduled task. action is START_BOT, STOP_BOT, RESTART_BOT, or SEND_COMMAND. Use runOnStartup instead of cron to run when the panel starts. targetBotIds is a list of bot ids, or ["ALL"]. SEND_COMMAND needs command, which the bot types in chat.',
        inputSchema: {
            name: z.string().min(1),
            action: z.enum(ACTIONS),
            targetBotIds: z.array(z.union([z.number().int(), z.literal('ALL')])).min(1),
            cronPattern: z.string().optional(),
            runOnStartup: z.boolean().optional(),
            command: z.string().optional(),
        },
    }, wrap('create_task', async ({ name, action, targetBotIds, cronPattern, runOnStartup = false, command }) => {
        const permErr = requirePermission(user, 'task:create');
        if (permErr) return permErr;
        const accessErr = await targetsAllowed(user, targetBotIds);
        if (accessErr) return accessErr;
        if (action === 'SEND_COMMAND' && !command) return err('SEND_COMMAND requires command');

        let cronValue = null;
        if (!runOnStartup) {
            cronValue = parseCron(cronPattern);
            if (!cronValue) return err('Invalid cron pattern');
        }

        const created = await prisma.scheduledTask.create({
            data: {
                name,
                action,
                targetBotIds: JSON.stringify(targetBotIds),
                payload: JSON.stringify(action === 'SEND_COMMAND' ? { command } : {}),
                cronPattern: cronValue,
                runOnStartup,
                isEnabled: true,
            },
        });
        if (!runOnStartup) TaskScheduler.scheduleTask(created);
        return ok(presentTask(created));
    }));

    server.registerTool('update_task', {
        description: 'Update a scheduled task. Omit fields to leave them unchanged. An invalid cron is rejected.',
        inputSchema: {
            taskId: z.number().int(),
            name: z.string().min(1).optional(),
            action: z.enum(ACTIONS).optional(),
            targetBotIds: z.array(z.union([z.number().int(), z.literal('ALL')])).optional(),
            cronPattern: z.string().nullable().optional(),
            runOnStartup: z.boolean().optional(),
            isEnabled: z.boolean().optional(),
            command: z.string().optional(),
        },
    }, wrap('update_task', async ({ taskId, name, action, targetBotIds, cronPattern, runOnStartup, isEnabled, command }) => {
        const permErr = requirePermission(user, 'task:edit');
        if (permErr) return permErr;
        const existing = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
        if (!existing) return err('Task not found');
        const currentTargets = jsonField(existing.targetBotIds, []);
        const nextTargets = targetBotIds || currentTargets;
        const accessErr = await targetsAllowed(user, nextTargets);
        if (accessErr) return accessErr;

        const data = {};
        if (name !== undefined) data.name = name;
        if (action !== undefined) data.action = action;
        if (typeof isEnabled === 'boolean') data.isEnabled = isEnabled;
        if (targetBotIds) data.targetBotIds = JSON.stringify(targetBotIds);
        if (typeof runOnStartup === 'boolean') {
            data.runOnStartup = runOnStartup;
            if (runOnStartup) data.cronPattern = null;
        }
        if (cronPattern) {
            const parsed = parseCron(cronPattern);
            if (!parsed) return err('Invalid cron pattern');
            data.cronPattern = parsed;
            data.runOnStartup = false;
        }
        if (command !== undefined) {
            const nextAction = action || existing.action;
            const payload = jsonField(existing.payload, {});
            data.payload = JSON.stringify(nextAction === 'SEND_COMMAND' ? { ...payload, command } : payload);
        }
        if (Object.keys(data).length === 0) return err('No fields to update');

        const updated = await prisma.scheduledTask.update({ where: { id: taskId }, data });
        await TaskScheduler.updateTask(updated);
        return ok(presentTask(updated));
    }));

    server.registerTool('delete_task', {
        description: 'Delete a scheduled task.',
        inputSchema: { taskId: z.number().int() },
    }, wrap('delete_task', async ({ taskId }) => {
        const permErr = requirePermission(user, 'task:delete');
        if (permErr) return permErr;
        const existing = await prisma.scheduledTask.findUnique({ where: { id: taskId } });
        if (!existing) return err('Task not found');
        const accessErr = await targetsAllowed(user, jsonField(existing.targetBotIds, []));
        if (accessErr) return accessErr;
        await prisma.scheduledTask.delete({ where: { id: taskId } });
        TaskScheduler.unscheduleTask(taskId);
        return ok({ success: true, taskId });
    }));
}

module.exports = register;
