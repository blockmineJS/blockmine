const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const fse = require('fs-extra');
const path = require('path');
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();
const router = express.Router({ mergeParams: true });

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const PLUGINS_BASE_DIR = path.join(DATA_DIR, 'storage', 'plugins');

// All routes in this file require plugin development permission
router.use(authenticate, authorize('plugin:develop'));

// Middleware to resolve plugin path and ensure it's safe
const resolvePluginPath = async (req, res, next) => {
    try {
        const { botId, pluginName } = req.params;
        if (!pluginName) {
            return res.status(400).json({ error: 'Имя плагина обязательно в пути.' });
        }
        
        const botPluginsDir = path.join(PLUGINS_BASE_DIR, `bot_${botId}`);
        const pluginPath = path.resolve(botPluginsDir, pluginName);

        // Security check: ensure the resolved path is still within the bot's plugins directory
        if (!pluginPath.startsWith(botPluginsDir)) {
            return res.status(403).json({ error: 'Доступ запрещен: попытка доступа за пределы директории плагина.' });
        }
        
        if (!await fse.pathExists(pluginPath)) {
            return res.status(404).json({ error: 'Директория плагина не найдена.' });
        }
        
        // Attach the safe path to the request object
        req.pluginPath = pluginPath;
        next();
    } catch (error) {
        console.error('[Plugin IDE Middleware Error]', error);
        res.status(500).json({ error: 'Не удалось определить путь к плагину.' });
    }
};

router.post('/create', async (req, res) => {
    try {
        const { botId } = req.params;
        const {
            name,
            version = '1.0.0',
            description = '',
            author = '',
            template = 'empty' // 'empty' or 'command'
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Имя плагина обязательно.' });
        }
        
        const pluginNameSlug = slugify(name, { lower: true, strict: true });
        const botPluginsDir = path.join(PLUGINS_BASE_DIR, `bot_${botId}`);
        const pluginPath = path.join(botPluginsDir, pluginNameSlug);

        if (await fse.pathExists(pluginPath)) {
            return res.status(409).json({ error: `Плагин с именем "${pluginNameSlug}" уже существует физически.` });
        }

        const existingPlugin = await prisma.installedPlugin.findFirst({
            where: { botId: parseInt(botId), name: pluginNameSlug }
        });

        if (existingPlugin) {
            return res.status(409).json({ error: `Плагин с именем "${pluginNameSlug}" уже зарегистрирован для этого бота.` });
        }
        
        await fse.mkdirp(pluginPath);

        const packageJson = {
            name: pluginNameSlug,
            version,
            description,
            author,
            botpanel: {
                main: 'index.js',
                settings: {
                    "helloMessage": {
                        "type": "string",
                        "label": "Сообщение приветствия",
                        "description": "Используйте {targetUser} и {user.username} для подстановок.",
                        "default": "Привет, {targetUser}, от {user.username}!"
                    }
                }
            }
        };
        await fse.writeFile(path.join(pluginPath, 'package.json'), JSON.stringify(packageJson, null, 2));

        if (template === 'command') {
            await fse.mkdirp(path.join(pluginPath, 'commands'));
            
            const commandContent = `module.exports = (bot) => {
    const Command = bot.api.Command;

    class HelloCommand extends Command {
        constructor(settings) {
            super({
                name: 'hello',
                description: 'Тестовая команда с расширенными параметрами',
                aliases: ['hi', 'привет'],
                permissions: '${pluginNameSlug}.use',
                owner: 'plugin:${pluginNameSlug}',
                cooldown: 10,
                allowedChatTypes: ['chat'],
                args: [
                    {
                        name: 'targetUser',
                        type: 'string',
                        description: 'Имя игрока, которого нужно поприветствовать.',
                        required: true
                    },
                    {
                        name: 'repeat',
                        type: 'number',
                        description: 'Количество повторений приветствия.',
                        required: false,
                        default: 1
                    }
                ]
            });

            this.settings = settings;
        }

        async handler(bot, typeChat, user, args) {
            const { targetUser, repeat } = args;

            // Используем сообщение из настроек, или значение по-умолчанию, если оно не найдено
            const messageTemplate = this.settings?.helloMessage || 'Привет, {targetUser}, от {user.username}!';
            
            const message = messageTemplate
                .replace('{targetUser}', targetUser)
                .replace('{user.username}', user.username);

            for (let i = 0; i < repeat; i++) {
                await bot.api.sendMessage(typeChat, message, user.username);
            }
        }
    }

    return HelloCommand;
};`;
            await fse.writeFile(path.join(pluginPath, 'commands', 'hello.js'), commandContent);

            const indexJsContent = `const createHelloCommand = require('./commands/hello.js');

const PERMISSION_NAME = '${pluginNameSlug}';
const PLUGIN_OWNER_ID = 'plugin:${pluginNameSlug}';

async function onLoad(bot, options) {
    const log = bot.sendLog;
    const settings = options.settings;
    
    try {
        const HelloCommand = createHelloCommand(bot);

        // Регистрация прав. 
        // Если право, указанное в команде, не будет найдено, 
        // система создаст его автоматически.
        // Эта регистрация нужна для того, чтобы задать правам описание.
        await bot.api.registerPermissions([
          { 
              name: PERMISSION_NAME + '.use', 
              description: 'Доступ к команде hello из плагина ${pluginNameSlug}', 
              owner: PLUGIN_OWNER_ID 
          }
        ]);
        
        await bot.api.registerCommand(new HelloCommand(settings));
        
        log(\`[\${PLUGIN_OWNER_ID}] Команда 'hello' успешно загружена.\`);
    } catch (error) {
        log(\`[\${PLUGIN_OWNER_ID}] Ошибка при загрузке: \${error.message}\`);
    }
}

async function onUnload({ botId, prisma }) {
    try {
        await prisma.command.deleteMany({ where: { botId, owner: PLUGIN_OWNER_ID } });
        await prisma.permission.deleteMany({ where: { botId, owner: PLUGIN_OWNER_ID } });
        console.log(\`[\${PLUGIN_OWNER_ID}] Ресурсы для бота ID \${botId} успешно удалены.\`);
    } catch (error) {
        console.error(\`[\${PLUGIN_OWNER_ID}] Ошибка при очистке ресурсов:\`, error);
    }
}

module.exports = {
    onLoad,
    onUnload,
};`;
            await fse.writeFile(path.join(pluginPath, 'index.js'), indexJsContent);
        } else {
            const indexJsContent = `module.exports = {
    onLoad: () => {
        console.log(\`Плагин "${pluginNameSlug}" загружен.\`);
    },
    onUnload: () => {
        console.log(\`Плагин "${pluginNameSlug}" выгружен.\`);
    }
};`;
            await fse.writeFile(path.join(pluginPath, 'index.js'), indexJsContent);
        }

        const newPlugin = await prisma.installedPlugin.create({
            data: {
                botId: parseInt(botId),
                name: pluginNameSlug,
                version,
                description,
                path: pluginPath,
                sourceType: 'LOCAL_IDE',
                sourceUri: pluginPath,
                manifest: JSON.stringify(packageJson.botpanel),
                isEnabled: true
            }
        });
        
        res.status(201).json(newPlugin);

    } catch (error) {
        console.error('[Plugin IDE Error] /create:', error);
        res.status(500).json({ error: 'Не удалось создать плагин.' });
    }
});

const readDirectoryRecursive = async (basePath, currentPath = '') => {
    const absolutePath = path.join(basePath, currentPath);
    const dirents = await fse.readdir(absolutePath, { withFileTypes: true });
    const files = await Promise.all(dirents.map(async (dirent) => {
        const direntPath = path.join(currentPath, dirent.name);
        if (dirent.isDirectory()) {
            return {
                name: dirent.name,
                type: 'folder',
                path: direntPath.replace(/\\\\/g, '/'),
                children: await readDirectoryRecursive(basePath, direntPath)
            };
        } else {
            return {
                name: dirent.name,
                type: 'file',
                path: direntPath.replace(/\\\\/g, '/'),
            };
        }
    }));
    return files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });
};


router.get('/:pluginName/structure', resolvePluginPath, async (req, res) => {
    try {
        const structure = await readDirectoryRecursive(req.pluginPath);
        res.json(structure);
    } catch (error) {
        console.error(`[Plugin IDE Error] /structure for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Failed to read plugin structure.' });
    }
});

router.get('/:pluginName/file', resolvePluginPath, async (req, res) => {
    try {
        const filePath = path.join(req.pluginPath, req.query.path);
        if (!filePath.startsWith(req.pluginPath)) {
            return res.status(403).json({ error: 'Доступ запрещен.' });
        }
        const content = await fse.readFile(filePath, 'utf-8');
        res.send(content);
    } catch (error) {
        res.status(500).json({ error: 'Не удалось прочитать файл.' });
    }
});

router.post('/:pluginName/file', resolvePluginPath, async (req, res) => {
    try {
        const { path: relativePath, content } = req.body;
        if (!relativePath || content === undefined) {
            return res.status(400).json({ error: 'File path and content are required.' });
        }
        
        const safePath = path.resolve(req.pluginPath, relativePath);

        if (!safePath.startsWith(req.pluginPath)) {
            return res.status(403).json({ error: 'Доступ запрещен.' });
        }
        
        await fse.writeFile(safePath, content, 'utf-8');
        res.status(200).json({ message: 'Файл успешно сохранен.' });
        
    } catch (error) {
        console.error(`[Plugin IDE Error] /file POST for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Не удалось сохранить файл.' });
    }
});

router.post('/:pluginName/fs', resolvePluginPath, async (req, res) => {
    try {
        const { operation, path: relativePath, newPath, content } = req.body;

        if (!operation || !relativePath) {
            return res.status(400).json({ error: 'Operation and path are required.' });
        }

        const safePath = path.resolve(req.pluginPath, relativePath);
        if (!safePath.startsWith(req.pluginPath)) {
            return res.status(403).json({ error: 'Access denied: Path is outside of plugin directory.' });
        }

        switch (operation) {
            case 'createFile':
                if (await fse.pathExists(safePath)) return res.status(409).json({ error: 'File already exists.' });
                await fse.writeFile(safePath, content || '', 'utf-8');
                res.status(201).json({ message: 'File created successfully.' });
                break;

            case 'createFolder':
                if (await fse.pathExists(safePath)) return res.status(409).json({ error: 'Folder already exists.' });
                await fse.mkdirp(safePath);
                res.status(201).json({ message: 'Folder created successfully.' });
                break;

            case 'delete':
                if (!await fse.pathExists(safePath)) return res.status(404).json({ error: 'File or folder not found.' });
                await fse.remove(safePath);
                res.status(200).json({ message: 'File or folder deleted successfully.' });
                break;
                
            case 'rename':
                if (!newPath) return res.status(400).json({ error: 'New path is required for rename operation.' });
                const safeNewPath = path.resolve(req.pluginPath, newPath);
                if (!safeNewPath.startsWith(req.pluginPath)) return res.status(403).json({ error: 'Access denied: New path is outside of plugin directory.' });
                if (!await fse.pathExists(safePath)) return res.status(404).json({ error: 'Source file or folder not found.' });
                if (await fse.pathExists(safeNewPath)) return res.status(409).json({ error: 'Destination path already exists.' });
                
                await fse.move(safePath, safeNewPath);
                res.status(200).json({ message: 'Renamed successfully.' });
                break;

            default:
                res.status(400).json({ error: 'Invalid operation specified.' });
        }
    } catch (error) {
        console.error(`[Plugin IDE Error] /fs POST for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'File system operation failed.' });
    }
});

router.get('/:pluginName/manifest', resolvePluginPath, async (req, res) => {
    try {
        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        const packageJson = await fse.readJson(packageJsonPath);
        res.json(packageJson);
    } catch (error) {
        res.status(500).json({ error: 'Не удалось прочитать package.json.' });
    }
});

router.post('/:pluginName/manifest', resolvePluginPath, async (req, res) => {
    try {
        const manifestPath = path.join(req.pluginPath, 'package.json');
        if (!await fse.pathExists(manifestPath)) {
            return res.status(404).json({ error: 'package.json not found.' });
        }

        const currentManifest = await fse.readJson(manifestPath);
        const { name, version, description, author } = req.body;

        const newManifest = {
            ...currentManifest,
            name: name || currentManifest.name,
            version: version || currentManifest.version,
            description: description,
            author: author,
        };
        
        await fse.writeJson(manifestPath, newManifest, { spaces: 2 });
        
        // Also update the DB record
        await prisma.installedPlugin.updateMany({
            where: {
                botId: parseInt(req.params.botId),
                path: req.pluginPath,
            },
            data: {
                name: newManifest.name,
                version: newManifest.version,
                description: newManifest.description,
            }
        });

        res.status(200).json({ message: 'package.json успешно обновлен.' });
    } catch (error) {
        console.error(`[Plugin IDE Error] /manifest POST for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Не удалось обновить package.json.' });
    }
});

router.post('/:pluginName/fork', resolvePluginPath, async (req, res) => {
    try {
        const { botId, pluginName } = req.params;
        const currentPlugin = await prisma.installedPlugin.findFirst({
            where: { botId: parseInt(botId), name: pluginName }
        });

        if (!currentPlugin || currentPlugin.sourceType !== 'GITHUB') {
            return res.status(400).json({ error: 'Копировать можно только плагины, установленные из GitHub.' });
        }
        
        const originalPath = req.pluginPath;
        let newName = `${pluginName}-copy`;
        let newPath = path.join(path.dirname(originalPath), newName);
        let counter = 1;

        while (await fse.pathExists(newPath) || await prisma.installedPlugin.findFirst({ where: { botId: parseInt(botId), name: newName } })) {
            newName = `${pluginName}-copy-${counter}`;
            newPath = path.join(path.dirname(originalPath), newName);
            counter++;
        }

        await fse.copy(originalPath, newPath);

        const packageJsonPath = path.join(newPath, 'package.json');
        const packageJson = await fse.readJson(packageJsonPath);
        
        packageJson.name = newName;
        packageJson.description = `(Forked from ${pluginName}) ${packageJson.description || ''}`;
        await fse.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        
        const forkedPlugin = await prisma.installedPlugin.create({
            data: {
                botId: parseInt(botId),
                name: newName,
                version: packageJson.version,
                description: packageJson.description,
                path: newPath,
                sourceType: 'LOCAL_IDE',
                sourceUri: newPath,
                manifest: JSON.stringify(packageJson.botpanel || {}),
                isEnabled: false // Forked plugins are disabled by default
            }
        });

        res.status(201).json(forkedPlugin);

    } catch (error) {
        console.error(`[Plugin IDE Error] /fork POST for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Не удалось скопировать плагин.' });
    }
});

module.exports = router; 