const { z } = require('zod');
const fse = require('fs-extra');
const path = require('path');
const os = require('os');
const slugify = require('slugify');
const prisma = require('../../../lib/prisma');
const { ok, err, wrap, requirePermission, requireBotAccess } = require('../helpers');

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const PLUGINS_BASE_DIR = path.join(DATA_DIR, 'storage', 'plugins');

async function findPluginRecord(botId, pluginName) {
    return prisma.installedPlugin.findFirst({ where: { botId, name: pluginName } });
}

function resolveInsidePlugin(pluginPath, relativePath) {
    if (typeof relativePath !== 'string' || relativePath.length === 0) {
        return { error: 'path is required' };
    }
    const resolved = path.resolve(pluginPath, relativePath);
    const rootWithSep = pluginPath.endsWith(path.sep) ? pluginPath : pluginPath + path.sep;
    if (resolved !== pluginPath && !resolved.startsWith(rootWithSep)) {
        return { error: 'Path escapes plugin directory' };
    }
    return { resolved };
}

async function readTree(basePath, currentPath = '') {
    const abs = path.join(basePath, currentPath);
    const entries = await fse.readdir(abs, { withFileTypes: true });
    const result = await Promise.all(entries.map(async (e) => {
        if (e.name === 'node_modules' || e.name === '.git') {
            return { name: e.name, type: e.isDirectory() ? 'folder' : 'file', path: path.join(currentPath, e.name).replace(/\\/g, '/'), skipped: true };
        }
        const rel = path.join(currentPath, e.name).replace(/\\/g, '/');
        if (e.isDirectory()) {
            return { name: e.name, type: 'folder', path: rel, children: await readTree(basePath, rel) };
        }
        return { name: e.name, type: 'file', path: rel };
    }));
    return result.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });
}

function register(server, { user }) {
    server.registerTool('create_plugin', {
        description: 'Create a new empty plugin (or with hello-command template) for a bot. Plugin files live on the BlockMine server in ~/.blockmine/storage/plugins/bot_<id>/<slug>/.',
        inputSchema: {
            botId: z.number().int(),
            name: z.string().min(1).describe('Display name; will be slugified for the folder/package name'),
            version: z.string().optional().describe('Default 1.0.0'),
            description: z.string().optional(),
            author: z.string().optional(),
            template: z.enum(['empty', 'command']).optional().describe('"empty" (default) or "command" for a hello-command template'),
        },
    }, wrap('create_plugin', async ({ botId, name, version = '1.0.0', description = '', author = '', template = 'empty' }) => {
        const permErr = requirePermission(user, 'plugin:install');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const slug = slugify(name, { lower: true, strict: true });
        if (!slug) return err('Invalid plugin name');

        const pluginPath = path.join(PLUGINS_BASE_DIR, `bot_${botId}`, slug);

        if (await fse.pathExists(pluginPath)) {
            return err(`Plugin folder "${slug}" already exists`);
        }
        const existing = await prisma.installedPlugin.findFirst({ where: { botId, name: slug } });
        if (existing) return err(`Plugin "${slug}" is already registered for this bot`);

        await fse.mkdirp(pluginPath);

        const packageJson = {
            name: slug,
            version,
            description,
            author,
            keywords: ['blockmine', 'blockmine-plugin', 'minecraft', 'mineflayer'],
            botpanel: {
                main: 'index.js',
                categories: [],
                supportedHosts: [],
                dependencies: [],
                settings: {},
            },
        };
        await fse.writeFile(path.join(pluginPath, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

        if (template === 'command') {
            await fse.mkdirp(path.join(pluginPath, 'commands'));
            const commandSrc = [
                "module.exports = (bot) => {",
                "    const Command = bot.api.Command;",
                "    class HelloCommand extends Command {",
                "        constructor(settings) {",
                "            super({",
                `                name: 'hello',`,
                `                description: 'Hello command',`,
                `                aliases: ['hi', 'привет'],`,
                `                permissions: '${slug}.use',`,
                `                owner: 'plugin:${slug}',`,
                `                cooldown: 5,`,
                `                allowedChatTypes: ['chat', 'private'],`,
                "                args: [{ name: 'targetUser', type: 'string', required: true }],",
                "            });",
                "            this.settings = settings || {};",
                "        }",
                "        async handler(bot, typeChat, user, { targetUser }) {",
                "            const msg = (this.settings.helloMessage || 'Hello, {targetUser}!')",
                "                .replace('{targetUser}', targetUser)",
                "                .replace('{user.username}', user.username);",
                "            await bot.api.sendMessage(typeChat, msg, user.username);",
                "        }",
                "    }",
                "    return HelloCommand;",
                "};",
                "",
            ].join('\n');
            await fse.writeFile(path.join(pluginPath, 'commands', 'hello.js'), commandSrc, 'utf-8');

            const indexSrc = [
                `const createHelloCommand = require('./commands/hello.js');`,
                `const PLUGIN_OWNER_ID = 'plugin:${slug}';`,
                "",
                "async function onLoad(bot, options) {",
                "    const settings = options.settings || {};",
                "    try {",
                "        await bot.api.registerPermissions([",
                `            { name: '${slug}.use', description: 'Use ${slug}', owner: PLUGIN_OWNER_ID },`,
                "        ]);",
                "        const HelloCommand = createHelloCommand(bot);",
                "        await bot.api.registerCommand(new HelloCommand(settings));",
                `        bot.sendLog('[${slug}] loaded');`,
                "    } catch (e) {",
                `        bot.sendLog('[${slug}] [FATAL] ' + e.stack);`,
                "    }",
                "}",
                "",
                "async function onUnload({ botId, prisma }) {",
                "    await prisma.command.deleteMany({ where: { botId, owner: PLUGIN_OWNER_ID } });",
                "    await prisma.permission.deleteMany({ where: { botId, owner: PLUGIN_OWNER_ID } });",
                "}",
                "",
                "module.exports = { onLoad, onUnload };",
                "",
            ].join('\n');
            await fse.writeFile(path.join(pluginPath, 'index.js'), indexSrc, 'utf-8');
        } else {
            const indexSrc = [
                "async function onLoad(bot) {",
                `    bot.sendLog('[${slug}] loaded');`,
                "}",
                "async function onUnload() {}",
                "module.exports = { onLoad, onUnload };",
                "",
            ].join('\n');
            await fse.writeFile(path.join(pluginPath, 'index.js'), indexSrc, 'utf-8');
        }

        const created = await prisma.installedPlugin.create({
            data: {
                botId,
                name: slug,
                version,
                description,
                path: pluginPath,
                sourceType: 'LOCAL_IDE',
                sourceUri: pluginPath,
                manifest: JSON.stringify(packageJson.botpanel),
                isEnabled: true,
            },
        });

        return ok({ success: true, plugin: created, pluginPath });
    }));

    server.registerTool('list_plugin_files', {
        description: 'List all files in a plugin directory (recursive tree). Skips node_modules and .git contents.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
        },
    }, wrap('list_plugin_files', async ({ botId, pluginName }) => {
        const permErr = requirePermission(user, 'plugin:settings:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugin = await findPluginRecord(botId, pluginName);
        if (!plugin) return err('Plugin not found');
        if (!await fse.pathExists(plugin.path)) return err('Plugin directory missing on disk');

        return ok({ pluginPath: plugin.path, tree: await readTree(plugin.path) });
    }));

    server.registerTool('read_plugin_file', {
        description: 'Read a file from a plugin directory.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
            path: z.string().min(1).describe('Path relative to plugin root, e.g. "index.js" or "commands/hello.js"'),
        },
    }, wrap('read_plugin_file', async ({ botId, pluginName, path: relPath }) => {
        const permErr = requirePermission(user, 'plugin:settings:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugin = await findPluginRecord(botId, pluginName);
        if (!plugin) return err('Plugin not found');

        const { resolved, error: pathErr } = resolveInsidePlugin(plugin.path, relPath);
        if (pathErr) return err(pathErr);
        if (!await fse.pathExists(resolved)) return err('File not found');

        const content = await fse.readFile(resolved, 'utf-8');
        return ok({ path: relPath, content });
    }));

    server.registerTool('write_plugin_file', {
        description: 'Write (create or overwrite) a file in a plugin directory. Creates parent folders if needed. If you write package.json, plugin name/version/manifest in the DB is also updated.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
            path: z.string().min(1).describe('Path relative to plugin root'),
            content: z.string().describe('Full new content of the file (UTF-8)'),
        },
    }, wrap('write_plugin_file', async ({ botId, pluginName, path: relPath, content }) => {
        const permErr = requirePermission(user, 'plugin:settings:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugin = await findPluginRecord(botId, pluginName);
        if (!plugin) return err('Plugin not found');

        const { resolved, error: pathErr } = resolveInsidePlugin(plugin.path, relPath);
        if (pathErr) return err(pathErr);

        await fse.mkdirp(path.dirname(resolved));
        await fse.writeFile(resolved, content, 'utf-8');

        const isPackageJson = relPath === 'package.json' || relPath.endsWith('/package.json');
        if (isPackageJson) {
            try {
                const pkg = JSON.parse(content);
                await prisma.installedPlugin.update({
                    where: { id: plugin.id },
                    data: {
                        version: pkg.version || plugin.version,
                        description: pkg.description ?? plugin.description,
                        manifest: JSON.stringify(pkg.botpanel || {}),
                    },
                });
            } catch (e) {
                return ok({ success: true, warning: `File saved but package.json invalid JSON: ${e.message}` });
            }
        }

        return ok({ success: true, path: relPath });
    }));

    server.registerTool('plugin_fs', {
        description: 'Filesystem ops on a plugin directory. operations: "createFolder" | "delete" | "rename" | "move". rename/move require newPath.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
            operation: z.enum(['createFolder', 'delete', 'rename', 'move']),
            path: z.string().min(1).describe('Source path relative to plugin root'),
            newPath: z.string().optional().describe('Target path for rename/move'),
        },
    }, wrap('plugin_fs', async ({ botId, pluginName, operation, path: relPath, newPath }) => {
        const permErr = requirePermission(user, 'plugin:settings:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugin = await findPluginRecord(botId, pluginName);
        if (!plugin) return err('Plugin not found');

        const { resolved: src, error: srcErr } = resolveInsidePlugin(plugin.path, relPath);
        if (srcErr) return err(srcErr);

        switch (operation) {
            case 'createFolder': {
                if (await fse.pathExists(src)) return err('Folder already exists');
                await fse.mkdirp(src);
                return ok({ success: true, created: relPath });
            }
            case 'delete': {
                if (!await fse.pathExists(src)) return err('Path not found');
                await fse.remove(src);
                return ok({ success: true, deleted: relPath });
            }
            case 'rename':
            case 'move': {
                if (!newPath) return err('newPath is required for rename/move');
                const { resolved: dst, error: dstErr } = resolveInsidePlugin(plugin.path, newPath);
                if (dstErr) return err(dstErr);
                if (!await fse.pathExists(src)) return err('Source path not found');
                if (await fse.pathExists(dst)) return err('Destination already exists');
                await fse.move(src, dst);
                return ok({ success: true, from: relPath, to: newPath });
            }
            default:
                return err('Unknown operation');
        }
    }));

    server.registerTool('reload_plugin', {
        description: 'After editing plugin files, reload the plugin by restarting the bot. Convenience wrapper around restart_bot for cases when the agent only knows pluginName.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1).describe('Used only to verify the plugin exists before restart'),
        },
    }, wrap('reload_plugin', async ({ botId, pluginName }) => {
        const permErr = requirePermission(user, 'bot:start_stop');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugin = await findPluginRecord(botId, pluginName);
        if (!plugin) return err('Plugin not found');

        const { botManager } = require('../../../core/services');
        botManager.stopBot(botId);
        setTimeout(async () => {
            const botConfig = await prisma.bot.findUnique({
                where: { id: botId },
                include: { server: true, proxy: true },
            });
            if (botConfig) botManager.startBot(botConfig);
        }, 1000);
        return ok({ success: true, message: 'Bot restart dispatched to reload plugin', pluginName });
    }));
}

module.exports = register;
