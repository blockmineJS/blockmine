const express = require('express');
const { authenticate } = require('../middleware/auth');
const fse = require('fs-extra');
const path = require('path');
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');
const { Octokit } = require('@octokit/rest');
const aiAssistantRouter = require('./aiAssistant');

const prisma = new PrismaClient();
const router = express.Router({ mergeParams: true });

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const PLUGINS_BASE_DIR = path.join(DATA_DIR, 'storage', 'plugins');

router.use(authenticate);

// Debug middleware для логирования всех запросов
router.use((req, res, next) => {
    console.log('[Plugin IDE] Request:', req.method, req.path, 'Params:', req.params);
    next();
});

// Подключаем AI Assistant роуты ПЕРЕД другими роутами
console.log('[Plugin IDE] Mounting AI Assistant router');
router.use('/:pluginName/ai', aiAssistantRouter);

const resolvePluginPath = async (req, res, next) => {
    try {
        const { botId, pluginName } = req.params;
        if (!pluginName) {
            return res.status(400).json({ error: 'Имя плагина обязательно в пути.' });
        }

        const plugin = await prisma.installedPlugin.findFirst({
            where: {
                botId: parseInt(botId),
                name: pluginName
            }
        });

        if (!plugin) {
            return res.status(404).json({ error: 'Плагин не найден в базе данных.' });
        }

        const pluginPath = plugin.path;

        if (!await fse.pathExists(pluginPath)) {
            return res.status(404).json({ error: 'Директория плагина не найдена в файловой системе.' });
        }

        req.pluginPath = pluginPath;
        req.pluginData = plugin;
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
            template = 'empty'
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
            keywords: ['blockmine', 'blockmine-plugin', 'minecraft', 'mineflayer'],
            botpanel: {
                main: 'index.js',
                categories: [],
                supportedHosts: [],
                dependencies: [],
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
        // Автоматическая инициализация Git если есть repository URL
        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        const gitPath = path.join(req.pluginPath, '.git');
        const gitignorePath = path.join(req.pluginPath, '.gitignore');

        if (await fse.pathExists(packageJsonPath) && !await fse.pathExists(gitPath)) {
            try {
                const packageJson = await fse.readJson(packageJsonPath);
                const repositoryUrl = packageJson.repository?.url || packageJson.repository;

                if (repositoryUrl && typeof repositoryUrl === 'string') {
                    const { execSync } = require('child_process');

                    execSync('git init', { cwd: req.pluginPath });

                    const cleanUrl = repositoryUrl.replace(/^git\+/, '');
                    execSync(`git remote add origin ${cleanUrl}`, { cwd: req.pluginPath });

                    console.log(`[Plugin IDE] Initialized git repository for ${req.params.pluginName} with remote: ${cleanUrl}`);
                }
            } catch (gitError) {
                // Не критично, продолжаем без git
                console.warn(`[Plugin IDE] Failed to auto-init git for ${req.params.pluginName}:`, gitError.message);
            }
        }

        // Автоматическое создание .gitignore если его нет
        if (!await fse.pathExists(gitignorePath)) {
            const defaultGitignore = `# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Coverage
coverage/
.nyc_output/
`;
            try {
                await fse.writeFile(gitignorePath, defaultGitignore, 'utf8');
                console.log(`[Plugin IDE] Created .gitignore for ${req.params.pluginName}`);
            } catch (gitignoreError) {
                console.warn(`[Plugin IDE] Failed to create .gitignore for ${req.params.pluginName}:`, gitignoreError.message);
            }
        }

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

        if (relativePath === 'package.json' || relativePath.endsWith('/package.json')) {
            try {
                const packageJson = JSON.parse(content);

                const existingPlugin = await prisma.installedPlugin.findFirst({
                    where: {
                        botId: parseInt(req.params.botId),
                        path: req.pluginPath,
                    }
                });

                if (existingPlugin) {
                    const newName = packageJson.name || req.params.pluginName;
                    const oldName = existingPlugin.name;

                    const conflictingPlugin = await prisma.installedPlugin.findFirst({
                        where: {
                            botId: parseInt(req.params.botId),
                            name: newName,
                            id: { not: existingPlugin.id }
                        }
                    });

                    if (conflictingPlugin) {
                        console.warn(`[Plugin IDE] Конфликт имени плагина: ${newName} уже существует для бота ${req.params.botId}`);
                        await prisma.installedPlugin.update({
                            where: { id: existingPlugin.id },
                            data: {
                                version: packageJson.version || '1.0.0',
                                description: packageJson.description || '',
                                manifest: JSON.stringify(packageJson.botpanel || {}),
                            }
                        });
                    } else {
                        // Если имя изменилось, переименовать папку плагина
                        if (oldName !== newName) {
                            const oldPath = req.pluginPath;
                            const pluginsDir = path.dirname(oldPath);
                            const newPath = path.join(pluginsDir, newName);

                            // Проверка что новая папка не существует
                            if (await fse.pathExists(newPath)) {
                                console.error(`[Plugin IDE] Папка ${newName} уже существует. Переименование невозможно.`);
                                return res.status(400).json({
                                    error: `Папка с именем "${newName}" уже существует. Переименование невозможно.`
                                });
                            }

                            try {
                                // Переименовать папку
                                await fse.rename(oldPath, newPath);
                                console.log(`[Plugin IDE] Папка плагина переименована: ${oldName} -> ${newName}`);

                                // Обновить БД с новым именем и путём
                                await prisma.installedPlugin.update({
                                    where: { id: existingPlugin.id },
                                    data: {
                                        name: newName,
                                        path: newPath,
                                        version: packageJson.version || '1.0.0',
                                        description: packageJson.description || '',
                                        manifest: JSON.stringify(packageJson.botpanel || {}),
                                    }
                                });

                                console.log(`[Plugin IDE] БД обновлена для плагина ${oldName} -> ${newName}`);

                                // Вернуть информацию о переименовании
                                return res.status(200).json({
                                    message: 'Файл успешно сохранен.',
                                    renamed: true,
                                    oldName: oldName,
                                    newName: newName
                                });
                            } catch (renameError) {
                                console.error(`[Plugin IDE] Ошибка переименования папки плагина:`, renameError);
                                return res.status(500).json({
                                    error: `Не удалось переименовать папку плагина: ${renameError.message}`
                                });
                            }
                        } else {
                            // Имя не изменилось, только обновляем метаданные
                            await prisma.installedPlugin.update({
                                where: { id: existingPlugin.id },
                                data: {
                                    version: packageJson.version || '1.0.0',
                                    description: packageJson.description || '',
                                    manifest: JSON.stringify(packageJson.botpanel || {}),
                                }
                            });
                        }
                    }
                    console.log(`[Plugin IDE] Manifest обновлен для плагина ${req.params.pluginName} после сохранения package.json`);
                }
            } catch (manifestError) {
                console.error(`[Plugin IDE] Ошибка обновления manifest для ${req.params.pluginName}:`, manifestError);
            }
        }

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

            case 'move':
                if (!newPath) return res.status(400).json({ error: 'New path is required for move operation.' });
                const safeMoveNewPath = path.resolve(req.pluginPath, newPath);
                if (!safeMoveNewPath.startsWith(req.pluginPath)) return res.status(403).json({ error: 'Access denied: New path is outside of plugin directory.' });
                if (!await fse.pathExists(safePath)) return res.status(404).json({ error: 'Source file or folder not found.' });

                if (safeMoveNewPath.startsWith(safePath + path.sep)) {
                    return res.status(400).json({ error: 'Cannot move folder into itself.' });
                }

                let finalPath = safeMoveNewPath;
                let counter = 1;
                while (await fse.pathExists(finalPath)) {
                    const ext = path.extname(safeMoveNewPath);
                    const base = path.basename(safeMoveNewPath, ext);
                    const dir = path.dirname(safeMoveNewPath);
                    finalPath = path.join(dir, `${base} (${counter})${ext}`);
                    counter++;
                }

                await fse.move(safePath, finalPath);
                res.status(200).json({
                    message: 'Moved successfully.',
                    newPath: path.relative(req.pluginPath, finalPath)
                });
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
        const { name, version, description, author, repositoryUrl } = req.body;

        const newManifest = {
            ...currentManifest,
            name: name || currentManifest.name,
            version: version || currentManifest.version,
            description: description,
            author: author,
        };

        if (repositoryUrl) {
            newManifest.repository = {
                type: 'git',
                url: repositoryUrl
            };
        }

        await fse.writeJson(manifestPath, newManifest, { spaces: 2 });

        const existingPlugin = await prisma.installedPlugin.findFirst({
            where: {
                botId: parseInt(req.params.botId),
                path: req.pluginPath,
            }
        });

        if (existingPlugin) {
            const conflictingPlugin = await prisma.installedPlugin.findFirst({
                where: {
                    botId: parseInt(req.params.botId),
                    name: newManifest.name,
                    id: { not: existingPlugin.id }
                }
            });

            if (conflictingPlugin) {
                console.warn(`[Plugin IDE] Конфликт имени плагина: ${newManifest.name} уже существует для бота ${req.params.botId}`);
                await prisma.installedPlugin.update({
                    where: { id: existingPlugin.id },
                    data: {
                        version: newManifest.version,
                        description: newManifest.description,
                        manifest: JSON.stringify(newManifest.botpanel || {}),
                    }
                });
            } else {
                await prisma.installedPlugin.update({
                    where: { id: existingPlugin.id },
                    data: {
                        name: newManifest.name,
                        version: newManifest.version,
                        description: newManifest.description,
                        manifest: JSON.stringify(newManifest.botpanel || {}),
                    }
                });
            }
        }

        res.status(200).json({ message: 'package.json успешно обновлен.' });
    } catch (error) {
        console.error(`[Plugin IDE Error] /manifest POST for ${req.params.pluginName}:`, error);
        // Файл уже сохранен, поэтому возвращаем успех даже если есть ошибка с БД
        res.status(200).json({ message: 'package.json обновлен (возможны проблемы с синхронизацией БД).' });
    }
});

router.post('/:pluginName/fork', resolvePluginPath, async (req, res) => {
    try {
        const { botId, pluginName } = req.params;
        const currentPlugin = await prisma.installedPlugin.findFirst({
            where: { botId: parseInt(botId), name: pluginName }
        });

        if (!currentPlugin || currentPlugin.sourceType !== 'GITHUB') {
            return res.status(400).json({ error: 'Превратить в локальный можно только плагины из GitHub.' });
        }

        // Просто меняем sourceType на LOCAL_IDE, без копирования
        const updatedPlugin = await prisma.installedPlugin.update({
            where: { id: currentPlugin.id },
            data: {
                sourceType: 'LOCAL_IDE',
                sourceUri: currentPlugin.path,  // Используем путь как sourceUri для локальных
            }
        });

        console.log(`[Plugin IDE] Плагин ${pluginName} превращен в локальный`);
        res.status(200).json(updatedPlugin);

    } catch (error) {
        console.error(`[Plugin IDE Error] /fork POST for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Не удалось превратить плагин в локальный.' });
    }
});

router.post('/:pluginName/create-pr', resolvePluginPath, async (req, res) => {
    const cp = require('child_process');
    const { token, branch = 'contribution', commitMessage = 'Changes from BlockMine IDE', prTitle, prBody } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'GitHub токен обязателен.' });
    }
    if (!branch) {
        return res.status(400).json({ error: 'Название ветки обязательно.' });
    }
    if (!branch.match(/^[\w\-.\/]+$/)) {
        return res.status(400).json({ error: 'Некорректное имя ветки.' });
    }

    try {
        cp.execSync('git --version');
    } catch (e) {
        return res.status(400).json({ error: 'Git не установлен на этой системе.' });
    }

    try {
        const githubToken = token;
        const manifestPath = path.join(req.pluginPath, 'package.json');
        const packageJson = await fse.readJson(manifestPath);
        let originalRepo = packageJson.repository?.url || packageJson.repository;

        if (!originalRepo) {
            return res.status(400).json({ error: 'URL репозитория не указан в package.json.' });
        }
        const cleanRepoUrl = originalRepo.replace(/^git\+/, '');

        const parseRepo = (url) => {
            const match = url.match(/(?:git\+)?https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?/);
            return match ? { owner: match[1], repo: match[2].replace(/\.git$/, '') } : null;
        };

        const repoInfo = parseRepo(cleanRepoUrl);
        if (!repoInfo) {
            return res.status(400).json({ error: 'Неверный формат URL репозитория.' });
        }

        const octokit = new Octokit({ auth: githubToken });

        // Получаем информацию о текущем пользователе
        const { data: user } = await octokit.users.getAuthenticated();
        const myUsername = user.login;

        console.log(`[Plugin IDE] Создание PR для ${repoInfo.owner}/${repoInfo.repo} от пользователя ${myUsername}`);

        // Проверяем, есть ли уже форк
        let forkInfo;
        try {
            const { data: existingFork } = await octokit.repos.get({
                owner: myUsername,
                repo: repoInfo.repo
            });

            // Проверяем что это действительно форк нужного репо
            if (existingFork.fork && existingFork.parent?.full_name === `${repoInfo.owner}/${repoInfo.repo}`) {
                forkInfo = existingFork;
                console.log(`[Plugin IDE] Используем существующий форк: ${myUsername}/${repoInfo.repo}`);
            }
        } catch (e) {
            // Форк не найден
        }

        // Создаём форк если нет
        if (!forkInfo) {
            console.log(`[Plugin IDE] Создаём форк ${repoInfo.owner}/${repoInfo.repo}...`);
            const { data: newFork } = await octokit.repos.createFork({
                owner: repoInfo.owner,
                repo: repoInfo.repo
            });
            forkInfo = newFork;

            // Ждём пока форк создастся
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log(`[Plugin IDE] Форк создан: ${myUsername}/${repoInfo.repo}`);
        }

        const cwd = req.pluginPath;
        const tempDir = path.join(cwd, '..', `temp-pr-${Date.now()}`);

        try {
            // Клонируем свой форк
            const forkUrl = `https://${githubToken}@github.com/${myUsername}/${repoInfo.repo}.git`;
            cp.execSync(`git clone "${forkUrl}" "${tempDir}"`, { stdio: 'pipe' });

            process.chdir(tempDir);

            // Добавляем оригинальный репо как upstream
            cp.execSync(`git remote add upstream ${cleanRepoUrl}`, { stdio: 'pipe' });
            cp.execSync('git fetch upstream', { stdio: 'pipe' });

            // Определяем основную ветку оригинала
            let defaultBranch = 'main';
            try {
                cp.execSync('git show-ref --verify refs/remotes/upstream/main', { stdio: 'pipe' });
            } catch {
                defaultBranch = 'master';
            }

            // Создаём ветку от upstream/main
            try {
                cp.execSync(`git checkout -b ${branch} upstream/${defaultBranch}`, { stdio: 'pipe' });
            } catch (e) {
                // Ветка может уже существовать
                cp.execSync(`git checkout ${branch}`, { stdio: 'pipe' });
                cp.execSync(`git reset --hard upstream/${defaultBranch}`, { stdio: 'pipe' });
            }

            // Копируем файлы из плагина
            const files = await fse.readdir(req.pluginPath);
            for (const file of files) {
                if (file !== '.git') {
                    const sourcePath = path.join(req.pluginPath, file);
                    const destPath = path.join(tempDir, file);
                    await fse.copy(sourcePath, destPath, { overwrite: true });
                }
            }

            // Коммитим изменения
            cp.execSync('git add .', { stdio: 'pipe' });
            try {
                cp.execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
            } catch (e) {
                if (e.message.includes('nothing to commit')) {
                    return res.status(400).json({ error: 'Нет изменений для коммита.' });
                }
                throw e;
            }

            // Пушим в свой форк
            cp.execSync(`git push origin ${branch} --force`, { stdio: 'pipe' });
            console.log(`[Plugin IDE] Изменения запушены в ${myUsername}/${repoInfo.repo}:${branch}`);

            // Создаём Pull Request через API
            let prData;
            try {
                const { data: pr } = await octokit.pulls.create({
                    owner: repoInfo.owner,
                    repo: repoInfo.repo,
                    title: prTitle || `Update from BlockMine IDE`,
                    body: prBody || `Changes made using BlockMine IDE.\n\n${commitMessage}`,
                    head: `${myUsername}:${branch}`,
                    base: defaultBranch
                });
                prData = pr;
                console.log(`[Plugin IDE] PR создан: ${pr.html_url}`);
            } catch (prError) {
                // PR может уже существовать
                if (prError.status === 422) {
                    // Ищем существующий PR
                    const { data: existingPRs } = await octokit.pulls.list({
                        owner: repoInfo.owner,
                        repo: repoInfo.repo,
                        head: `${myUsername}:${branch}`,
                        state: 'open'
                    });

                    if (existingPRs.length > 0) {
                        prData = existingPRs[0];
                        console.log(`[Plugin IDE] PR уже существует: ${prData.html_url}`);
                    } else {
                        throw prError;
                    }
                } else {
                    throw prError;
                }
            }

            res.json({
                success: true,
                prUrl: prData.html_url,
                prNumber: prData.number,
                message: 'Pull Request создан успешно'
            });

        } finally {
            try {
                process.chdir(req.pluginPath);
                await fse.remove(tempDir);
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
        }

    } catch (error) {
        console.error('[Plugin IDE Error] /create-pr:', error);
        res.status(500).json({ error: 'Не удалось создать PR: ' + error.message });
    }
});

// Search in files
router.get('/:pluginName/search', resolvePluginPath, async (req, res) => {
    try {
        const { query, caseSensitive, wholeWord, useRegex } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required.' });
        }

        const results = [];

        const searchInFile = async (filePath, relativePath) => {
            try {
                const content = await fse.readFile(filePath, 'utf-8');
                const lines = content.split('\n');
                const matches = [];

                let pattern;
                if (useRegex === 'true') {
                    try {
                        pattern = new RegExp(query, caseSensitive === 'true' ? 'g' : 'gi');
                    } catch (e) {
                        return; // Invalid regex, skip
                    }
                } else {
                    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const wordBoundary = wholeWord === 'true' ? '\\b' : '';
                    pattern = new RegExp(
                        `${wordBoundary}${escapedQuery}${wordBoundary}`,
                        caseSensitive === 'true' ? 'g' : 'gi'
                    );
                }

                lines.forEach((line, index) => {
                    if (pattern.test(line)) {
                        matches.push({
                            line: index + 1,
                            preview: line.trim().substring(0, 200),
                        });
                    }
                });

                if (matches.length > 0) {
                    results.push({
                        file: relativePath,
                        matches,
                    });
                }
            } catch (error) {
                // Skip files that can't be read
            }
        };

        const searchDirectory = async (dirPath, relativePath = '') => {
            const dirents = await fse.readdir(dirPath, { withFileTypes: true });

            for (const dirent of dirents) {
                const fullPath = path.join(dirPath, dirent.name);
                const relPath = path.join(relativePath, dirent.name).replace(/\\/g, '/');

                // Skip node_modules and hidden directories
                if (dirent.name.startsWith('.') || dirent.name === 'node_modules') {
                    continue;
                }

                if (dirent.isDirectory()) {
                    await searchDirectory(fullPath, relPath);
                } else {
                    // Only search text files
                    const ext = path.extname(dirent.name).toLowerCase();
                    const textExtensions = [
                        '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt',
                        '.html', '.css', '.scss', '.yaml', '.yml', '.xml'
                    ];
                    if (textExtensions.includes(ext)) {
                        await searchInFile(fullPath, relPath);
                    }
                }
            }
        };

        await searchDirectory(req.pluginPath);

        res.json({ results });
    } catch (error) {
        console.error(`[Plugin IDE Error] /search for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Search failed.' });
    }
});

// Replace in files
router.post('/:pluginName/replace', resolvePluginPath, async (req, res) => {
    try {
        const { searchQuery, replaceQuery, options } = req.body;

        if (!searchQuery || replaceQuery === undefined) {
            return res.status(400).json({ error: 'Search and replace queries are required.' });
        }

        let replacedCount = 0;
        let filesModified = 0;

        const replaceInFile = async (filePath) => {
            try {
                const content = await fse.readFile(filePath, 'utf-8');

                let pattern;
                if (options.useRegex) {
                    try {
                        pattern = new RegExp(searchQuery, options.caseSensitive ? 'g' : 'gi');
                    } catch (e) {
                        return 0; // Invalid regex, skip
                    }
                } else {
                    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const wordBoundary = options.wholeWord ? '\\b' : '';
                    pattern = new RegExp(
                        `${wordBoundary}${escapedQuery}${wordBoundary}`,
                        options.caseSensitive ? 'g' : 'gi'
                    );
                }

                const matches = content.match(pattern);
                if (!matches) return 0;

                const newContent = content.replace(pattern, replaceQuery);
                await fse.writeFile(filePath, newContent, 'utf-8');

                return matches.length;
            } catch (error) {
                return 0;
            }
        };

        const processDirectory = async (dirPath) => {
            const dirents = await fse.readdir(dirPath, { withFileTypes: true });

            for (const dirent of dirents) {
                const fullPath = path.join(dirPath, dirent.name);

                if (dirent.name.startsWith('.') || dirent.name === 'node_modules') {
                    continue;
                }

                if (dirent.isDirectory()) {
                    await processDirectory(fullPath);
                } else {
                    const ext = path.extname(dirent.name).toLowerCase();
                    const textExtensions = [
                        '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt',
                        '.html', '.css', '.scss', '.yaml', '.yml', '.xml'
                    ];
                    if (textExtensions.includes(ext)) {
                        const count = await replaceInFile(fullPath);
                        if (count > 0) {
                            replacedCount += count;
                            filesModified++;
                        }
                    }
                }
            }
        };

        await processDirectory(req.pluginPath);

        res.json({ replacedCount, filesModified });
    } catch (error) {
        console.error(`[Plugin IDE Error] /replace for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Replace failed.' });
    }
});

// Get plugin info from package.json
router.get('/:pluginName/info', resolvePluginPath, async (req, res) => {
    try {
        const packageJsonPath = path.join(req.pluginPath, 'package.json');

        if (!await fse.pathExists(packageJsonPath)) {
            return res.json({
                hasRepository: false,
                name: req.params.pluginName,
                message: 'package.json not found'
            });
        }

        const packageJson = await fse.readJson(packageJsonPath);

        const hasRepository = !!(packageJson.repository && (
            packageJson.repository.url ||
            (typeof packageJson.repository === 'string' && packageJson.repository.length > 0)
        ));

        const repositoryInfo = hasRepository ? {
            url: typeof packageJson.repository === 'string'
                ? packageJson.repository
                : packageJson.repository.url,
            type: typeof packageJson.repository === 'object'
                ? packageJson.repository.type
                : 'git'
        } : null;

        const files = await fse.readdir(req.pluginPath);
        const hasFiles = files.some(f => f !== 'package.json' && !f.startsWith('.'));

        res.json({
            hasRepository,
            hasFiles,
            name: packageJson.name || req.params.pluginName,
            version: packageJson.version,
            description: packageJson.description,
            author: packageJson.author,
            license: packageJson.license,
            repository: repositoryInfo,
            botpanel: packageJson.botpanel || null
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /info for ${req.params.pluginName}:`, error);
        res.status(500).json({ error: 'Failed to read plugin info.' });
    }
});

router.post('/:pluginName/clone', resolvePluginPath, async (req, res) => {
    try {
        const { gitUrl } = req.body;

        if (!gitUrl || typeof gitUrl !== 'string' || !gitUrl.trim()) {
            return res.status(400).json({ error: 'Git URL is required.' });
        }

        const { execSync } = require('child_process');

        const files = await fse.readdir(req.pluginPath);
        const nonPackageFiles = files.filter(f => f !== 'package.json');

        if (nonPackageFiles.length > 0) {
            return res.status(400).json({
                error: 'Plugin directory is not empty. Cannot clone into existing plugin.'
            });
        }

        const tempDir = path.join(req.pluginPath, '.clone-temp');
        await fse.mkdirp(tempDir);

        try {
            console.log(`[Plugin IDE] Cloning ${gitUrl} into ${tempDir}...`);

            execSync(`git clone "${gitUrl}" "${tempDir}"`, {
                stdio: 'inherit',
                cwd: req.pluginPath
            });

            const clonedFiles = await fse.readdir(tempDir);
            for (const file of clonedFiles) {
                if (file === '.git') continue;
                const srcPath = path.join(tempDir, file);
                const destPath = path.join(req.pluginPath, file);
                await fse.move(srcPath, destPath, { overwrite: true });
            }

            await fse.remove(tempDir);

            const packageJsonPath = path.join(req.pluginPath, 'package.json');
            if (!await fse.pathExists(packageJsonPath)) {
                throw new Error('Cloned repository does not contain package.json');
            }

            const packageJson = await fse.readJson(packageJsonPath);
            if (!packageJson.repository) {
                packageJson.repository = {
                    type: 'git',
                    url: gitUrl
                };
                await fse.writeJson(packageJsonPath, packageJson, { spaces: 2 });
            }

            console.log(`[Plugin IDE] Successfully cloned ${gitUrl}`);

            res.json({
                success: true,
                message: 'Plugin cloned successfully',
                repository: gitUrl
            });
        } catch (cloneError) {
            await fse.remove(tempDir).catch(() => {});
            throw cloneError;
        }
    } catch (error) {
        console.error(`[Plugin IDE Error] /clone for ${req.params.pluginName}:`, error);
        res.status(500).json({
            error: error.message || 'Failed to clone plugin from Git.'
        });
    }
});

router.post('/:pluginName/github/create', resolvePluginPath, async (req, res) => {
    try {
        const { token, repoName, isPrivate = true } = req.body;

        if (!token || !repoName) {
            return res.status(400).json({ error: 'Token and repository name are required.' });
        }

        const octokit = new Octokit({ auth: token });

        // Читаем package.json для получения description
        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        let description = 'BlockMine plugin for Minecraft bots';
        if (await fse.pathExists(packageJsonPath)) {
            const packageJson = await fse.readJson(packageJsonPath);
            if (packageJson.description) {
                description = `${packageJson.description} | BlockMine plugin`;
            }
        }

        console.log(`[Plugin IDE] Creating GitHub repository: ${repoName}`);
        const { data: repo } = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            description: description,
            private: isPrivate,
            auto_init: false,
            homepage: 'https://github.com/blockmineJS'
        });

        console.log(`[Plugin IDE] Repository created: ${repo.html_url}`);

        // Добавляем topics (теги) для поиска на GitHub
        try {
            await octokit.repos.replaceAllTopics({
                owner: repo.owner.login,
                repo: repo.name,
                names: ['blockmine', 'blockmine-plugin', 'minecraft', 'mineflayer', 'minecraft-bot']
            });
            console.log(`[Plugin IDE] Topics added to repository`);
        } catch (topicError) {
            console.warn(`[Plugin IDE] Failed to add topics:`, topicError.message);
        }

        await uploadFilesToGitHub(octokit, repo.owner.login, repo.name, req.pluginPath);

        // Обновляем package.json с URL репозитория и keywords
        if (await fse.pathExists(packageJsonPath)) {
            const packageJson = await fse.readJson(packageJsonPath);
            packageJson.repository = {
                type: 'git',
                url: repo.html_url
            };

            // Добавляем keywords для npm (если будет публиковаться)
            if (!packageJson.keywords) {
                packageJson.keywords = [];
            }
            const keywords = ['blockmine', 'blockmine-plugin', 'minecraft', 'mineflayer'];
            keywords.forEach(kw => {
                if (!packageJson.keywords.includes(kw)) {
                    packageJson.keywords.push(kw);
                }
            });

            await fse.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        }

        res.json({
            success: true,
            repository: repo.html_url,
            message: 'Plugin uploaded to new GitHub repository'
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /github/create:`, error);
        res.status(500).json({
            error: error.message || 'Failed to create repository and upload plugin.'
        });
    }
});

router.post('/:pluginName/github/upload', resolvePluginPath, async (req, res) => {
    try {
        const { token, repoFullName } = req.body;

        if (!token || !repoFullName) {
            return res.status(400).json({ error: 'Token and repository name are required.' });
        }

        const [owner, repo] = repoFullName.split('/');
        if (!owner || !repo) {
            return res.status(400).json({ error: 'Invalid repository name format. Expected: owner/repo' });
        }

        const octokit = new Octokit({ auth: token });

        try {
            await octokit.repos.get({ owner, repo });
        } catch (error) {
            return res.status(404).json({ error: 'Repository not found or access denied.' });
        }

        console.log(`[Plugin IDE] Uploading to existing repository: ${repoFullName}`);

        await uploadFilesToGitHub(octokit, owner, repo, req.pluginPath);

        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        if (await fse.pathExists(packageJsonPath)) {
            const packageJson = await fse.readJson(packageJsonPath);
            packageJson.repository = {
                type: 'git',
                url: `https://github.com/${repoFullName}`
            };
            await fse.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        }

        res.json({
            success: true,
            repository: `https://github.com/${repoFullName}`,
            message: 'Plugin uploaded to GitHub repository'
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /github/upload:`, error);
        res.status(500).json({
            error: error.message || 'Failed to upload plugin to repository.'
        });
    }
});

router.get('/:pluginName/github/tags', resolvePluginPath, async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token is required.' });
        }

        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        if (!await fse.pathExists(packageJsonPath)) {
            return res.status(404).json({ error: 'package.json not found.' });
        }

        const packageJson = await fse.readJson(packageJsonPath);
        const repoUrl = typeof packageJson.repository === 'string'
            ? packageJson.repository
            : packageJson.repository?.url;

        if (!repoUrl) {
            return res.status(400).json({ error: 'No repository URL in package.json.' });
        }

        const match = repoUrl.match(/github\.com[\/:](.+?)\/(.+?)(\.git)?$/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid GitHub repository URL.' });
        }

        const [, owner, repo] = match;
        const octokit = new Octokit({ auth: token });

        const { data: tags } = await octokit.repos.listTags({
            owner,
            repo,
            per_page: 100
        });

        const { data: releases } = await octokit.repos.listReleases({
            owner,
            repo,
            per_page: 100
        });

        const tagsWithReleases = tags.map(tag => {
            const release = releases.find(r => r.tag_name === tag.name);
            return {
                name: tag.name,
                commit: tag.commit.sha,
                hasRelease: !!release,
                releaseId: release?.id,
                releaseBody: release?.body,
                releaseUrl: release?.html_url,
                publishedAt: release?.published_at
            };
        });

        res.json({
            tags: tagsWithReleases,
            latestTag: tags[0]?.name || null
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /github/tags:`, error);
        res.status(500).json({
            error: error.message || 'Failed to fetch tags from GitHub.'
        });
    }
});

router.post('/:pluginName/github/release', resolvePluginPath, async (req, res) => {
    try {
        const { token, tagName, description, uploadFiles = true } = req.body;

        if (!token || !tagName) {
            return res.status(400).json({ error: 'Token and tag name are required.' });
        }

        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        if (!await fse.pathExists(packageJsonPath)) {
            return res.status(404).json({ error: 'package.json not found.' });
        }

        const packageJson = await fse.readJson(packageJsonPath);
        const repoUrl = typeof packageJson.repository === 'string'
            ? packageJson.repository
            : packageJson.repository?.url;

        if (!repoUrl) {
            return res.status(400).json({ error: 'No repository URL in package.json.' });
        }

        const match = repoUrl.match(/github\.com[\/:](.+?)\/(.+?)(\.git)?$/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid GitHub repository URL.' });
        }

        const [, owner, repo] = match;
        const octokit = new Octokit({ auth: token });

        // Проверяем, имеет ли пользователь права на запись в этот репозиторий
        const { data: user } = await octokit.users.getAuthenticated();
        const myUsername = user.login;

        // Проверяем права доступа
        try {
            const { data: repoInfo } = await octokit.repos.get({ owner, repo });

            // Если не владелец и не имеет прав push
            if (repoInfo.permissions && !repoInfo.permissions.push) {
                return res.status(403).json({
                    error: `У вас нет прав на создание релиза в репозитории ${owner}/${repo}. Используйте "Создать Pull Request" для внесения изменений в чужие плагины.`,
                    suggestPR: true
                });
            }
        } catch (permError) {
            // Если не можем получить инфо о репо, скорее всего нет доступа
            if (permError.status === 404) {
                return res.status(403).json({
                    error: `Репозиторий ${owner}/${repo} не найден или у вас нет доступа. Для внесения изменений в чужие плагины используйте "Создать Pull Request".`,
                    suggestPR: true
                });
            }
            throw permError;
        }

        if (uploadFiles) {
            console.log(`[Plugin IDE] Uploading files before creating release ${tagName}`);
            await uploadFilesToGitHub(octokit, owner, repo, req.pluginPath);
        }

        const { data: ref } = await octokit.git.getRef({
            owner,
            repo,
            ref: 'heads/main'
        });
        const commitSha = ref.object.sha;

        console.log(`[Plugin IDE] Creating tag ${tagName}`);
        const { data: tagObject } = await octokit.git.createTag({
            owner,
            repo,
            tag: tagName,
            message: `Release ${tagName}`,
            object: commitSha,
            type: 'commit'
        });

        await octokit.git.createRef({
            owner,
            repo,
            ref: `refs/tags/${tagName}`,
            sha: tagObject.sha
        });

        console.log(`[Plugin IDE] Creating release for ${tagName}`);
        const { data: release } = await octokit.repos.createRelease({
            owner,
            repo,
            tag_name: tagName,
            name: tagName,
            body: description || '',
            draft: false,
            prerelease: false
        });

        res.json({
            success: true,
            tag: tagName,
            releaseUrl: release.html_url,
            message: `Release ${tagName} created successfully`
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /github/release:`, error);
        res.status(500).json({
            error: error.message || 'Failed to create release on GitHub.'
        });
    }
});

router.get('/:pluginName/git/status', resolvePluginPath, async (req, res) => {
    try {
        const { execSync } = require('child_process');

        const gitDir = path.join(req.pluginPath, '.git');
        if (!await fse.pathExists(gitDir)) {
            return res.json({
                isGitRepo: false,
                message: 'Not a git repository'
            });
        }

        const statusOutput = execSync('git status --porcelain', {
            cwd: req.pluginPath,
            encoding: 'utf8'
        });

        const staged = [];
        const unstaged = [];
        const lines = statusOutput.split('\n').filter(line => line.trim());

        for (const line of lines) {
            const statusCodes = line.substring(0, 2);
            const filePath = line.substring(3);

            const x = statusCodes[0];
            const y = statusCodes[1];

            let status = 'M';
            if (x === 'A' || y === 'A') status = 'A';
            if (x === 'D' || y === 'D') status = 'D';
            if (x === 'R') status = 'R';
            if (x === '?' && y === '?') status = '?';

            if (x !== ' ' && x !== '?') {
                staged.push({
                    path: filePath,
                    status: x
                });
            }

            if (y !== ' ') {
                unstaged.push({
                    path: filePath,
                    status: y === '?' ? '?' : y
                });
            }
        }

        let branch = 'main';
        try {
            branch = execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: req.pluginPath,
                encoding: 'utf8'
            }).trim();
        } catch (branchError) {
            // Если HEAD не существует (нет коммитов), пытаемся получить дефолтную ветку
            try {
                branch = execSync('git branch --show-current', {
                    cwd: req.pluginPath,
                    encoding: 'utf8'
                }).trim() || 'master';
            } catch {
                // Если и это не работает, остается 'main'
            }
        }

        res.json({
            isGitRepo: true,
            branch,
            staged,
            unstaged
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/status:`, error);
        res.status(500).json({
            error: error.message || 'Failed to get git status.'
        });
    }
});

router.post('/:pluginName/git/add', resolvePluginPath, async (req, res) => {
    try {
        const { files } = req.body;
        const { execSync } = require('child_process');

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'Files array is required.' });
        }

        for (const file of files) {
            execSync(`git add "${file}"`, {
                cwd: req.pluginPath
            });
        }

        res.json({
            success: true,
            message: `Staged ${files.length} file(s)`
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/add:`, error);
        res.status(500).json({
            error: error.message || 'Failed to stage files.'
        });
    }
});

router.post('/:pluginName/git/reset', resolvePluginPath, async (req, res) => {
    try {
        const { files } = req.body;
        const { execSync } = require('child_process');

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'Files array is required.' });
        }

        // Check if HEAD exists (repo has commits)
        let hasCommits = true;
        try {
            execSync('git rev-parse --verify HEAD', {
                cwd: req.pluginPath,
                stdio: 'ignore'
            });
        } catch {
            hasCommits = false;
        }

        // Reset files
        for (const file of files) {
            if (hasCommits) {
                execSync(`git reset HEAD "${file}"`, {
                    cwd: req.pluginPath
                });
            } else {
                execSync(`git rm --cached -f "${file}"`, {
                    cwd: req.pluginPath
                });
            }
        }

        res.json({
            success: true,
            message: `Unstaged ${files.length} file(s)`
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/reset:`, error);
        res.status(500).json({
            error: error.message || 'Failed to unstage files.'
        });
    }
});

router.post('/:pluginName/git/commit', resolvePluginPath, async (req, res) => {
    try {
        const { message } = req.body;
        const { execSync } = require('child_process');

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Commit message is required.' });
        }

        const output = execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
            cwd: req.pluginPath,
            encoding: 'utf8'
        });

        res.json({
            success: true,
            message: 'Commit created successfully',
            output
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/commit:`, error);
        res.status(500).json({
            error: error.message || 'Failed to create commit.'
        });
    }
});

router.post('/:pluginName/git/push', resolvePluginPath, async (req, res) => {
    try {
        const { execSync } = require('child_process');

        const output = execSync('git push origin main', {
            cwd: req.pluginPath,
            encoding: 'utf8'
        });

        res.json({
            success: true,
            message: 'Pushed to GitHub successfully',
            output
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/push:`, error);
        res.status(500).json({
            error: error.message || 'Failed to push to GitHub.'
        });
    }
});

router.post('/:pluginName/git/sync', resolvePluginPath, async (req, res) => {
    try {
        const { execSync } = require('child_process');

        execSync('git fetch origin', { cwd: req.pluginPath });

        let mainBranch = 'main';
        try {
            execSync('git show-ref --verify refs/remotes/origin/main', {
                cwd: req.pluginPath,
                stdio: 'ignore'
            });
        } catch {
            mainBranch = 'master';
        }

        let currentBranch = '';
        try {
            currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: req.pluginPath,
                encoding: 'utf8'
            }).trim();
        } catch {

        }


        execSync(`git reset --hard origin/${mainBranch}`, { cwd: req.pluginPath });

        if (!currentBranch || currentBranch === 'HEAD') {
            execSync(`git branch -M ${mainBranch}`, { cwd: req.pluginPath });
        }

        res.json({
            success: true,
            message: `Синхронизировано с GitHub (ветка: ${mainBranch})`,
            branch: mainBranch
        });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/sync:`, error);
        res.status(500).json({
            error: error.message || 'Не удалось синхронизировать с GitHub.'
        });
    }
});

router.get('/:pluginName/git/log', resolvePluginPath, async (req, res) => {
    try {
        const { execSync } = require('child_process');
        const { limit = 20 } = req.query;

        let output = '';
        try {
            output = execSync(`git log --pretty=format:"%H|||%an|||%ae|||%at|||%s" -n ${limit}`, {
                cwd: req.pluginPath,
                encoding: 'utf8'
            });
        } catch (logError) {
            // Если нет коммитов, возвращаем пустой массив
            if (logError.message.includes('does not have any commits yet') ||
                logError.message.includes('bad default revision')) {
                return res.json({ commits: [] });
            }
            throw logError;
        }

        const commits = output.split('\n').filter(line => line.trim()).map(line => {
            const [hash, author, email, timestamp, message] = line.split('|||');
            return {
                hash,
                author,
                email,
                date: new Date(parseInt(timestamp) * 1000).toISOString(),
                message
            };
        });

        res.json({ commits });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/log:`, error);
        res.status(500).json({
            error: error.message || 'Failed to get git log.'
        });
    }
});

router.get('/:pluginName/git/diff', resolvePluginPath, async (req, res) => {
    try {
        const { execSync } = require('child_process');
        const { path: filePath, staged, status } = req.query;

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        let diff = '';

        if (status === '?' || status === 'A') {
            try {
                const fullPath = path.join(req.pluginPath, filePath);
                const content = await fse.readFile(fullPath, 'utf8');
                const lines = content.split('\n');
                diff = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;
                diff += lines.map(line => '+' + line).join('\n');
            } catch (readError) {
                return res.status(500).json({ error: 'Failed to read file content' });
            }
        } else {

            const command = staged === 'true'
                ? `git diff --cached "${filePath}"`
                : `git diff "${filePath}"`;

            try {
                diff = execSync(command, {
                    cwd: req.pluginPath,
                    encoding: 'utf8'
                });

                if (!diff && status === 'M') {
                    diff = 'No changes detected (this might be a git issue)';
                }
            } catch (diffError) {
                try {
                    const fullPath = path.join(req.pluginPath, filePath);
                    const content = await fse.readFile(fullPath, 'utf8');
                    const lines = content.split('\n');
                    diff = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;
                    diff += lines.map(line => '+' + line).join('\n');
                } catch {
                    diff = `Error getting diff: ${diffError.message}`;
                }
            }
        }

        res.json({ diff: diff || 'No changes', path: filePath });
    } catch (error) {
        console.error(`[Plugin IDE Error] /git/diff:`, error);
        res.status(500).json({
            error: error.message || 'Failed to get file diff.'
        });
    }
});

async function uploadFilesToGitHub(octokit, owner, repo, pluginPath) {
    const filesToUpload = [];

    const collectFiles = async (dir, baseDir = pluginPath) => {
        const entries = await fse.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }

            if (entry.isDirectory()) {
                await collectFiles(fullPath, baseDir);
            } else {
                const content = await fse.readFile(fullPath);
                filesToUpload.push({
                    path: relativePath,
                    content: content.toString('base64')
                });
            }
        }
    };

    await collectFiles(pluginPath);

    console.log(`[Plugin IDE] Uploading ${filesToUpload.length} files to ${owner}/${repo}`);

    let isEmptyRepo = false;
    try {
        await octokit.git.getRef({
            owner,
            repo,
            ref: 'heads/main'
        });
    } catch (error) {
        isEmptyRepo = true;
        console.log('[Plugin IDE] Empty repository detected, using Contents API');
    }

    if (isEmptyRepo) {
        for (const file of filesToUpload) {
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: file.path,
                message: `Add ${file.path}`,
                content: file.content,
                branch: 'main'
            });
        }
        console.log(`[Plugin IDE] Successfully uploaded ${filesToUpload.length} files via Contents API`);
    } else {
        const { data: ref } = await octokit.git.getRef({
            owner,
            repo,
            ref: 'heads/main'
        });
        const parentSha = ref.object.sha;

        const { data: commit } = await octokit.git.getCommit({
            owner,
            repo,
            commit_sha: parentSha
        });
        const baseTreeSha = commit.tree.sha;

        const blobs = await Promise.all(
            filesToUpload.map(async (file) => {
                const { data } = await octokit.git.createBlob({
                    owner,
                    repo,
                    content: file.content,
                    encoding: 'base64'
                });
                return {
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    sha: data.sha
                };
            })
        );

        const { data: tree } = await octokit.git.createTree({
            owner,
            repo,
            tree: blobs,
            base_tree: baseTreeSha
        });

        const { data: newCommit } = await octokit.git.createCommit({
            owner,
            repo,
            message: 'Update plugin files from BlockMine IDE',
            tree: tree.sha,
            parents: [parentSha]
        });

        await octokit.git.updateRef({
            owner,
            repo,
            ref: 'heads/main',
            sha: newCommit.sha
        });

        console.log(`[Plugin IDE] Successfully uploaded ${filesToUpload.length} files via Git Tree API`);
    }
}

/**
 * POST /:pluginName/submit-to-official-list
 * Создает PR в blockmineJS/official-plugins-list для добавления плагина
 */
router.post('/:pluginName/submit-to-official-list', resolvePluginPath, async (req, res) => {
    try {
        const { token, pluginDisplayName, icon } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'GitHub token is required.' });
        }

        if (!pluginDisplayName || !icon) {
            return res.status(400).json({ error: 'Plugin name and icon are required.' });
        }

        // Читаем package.json плагина
        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        if (!await fse.pathExists(packageJsonPath)) {
            return res.status(404).json({ error: 'package.json not found.' });
        }

        const packageJson = await fse.readJson(packageJsonPath);
        const repoUrl = typeof packageJson.repository === 'string'
            ? packageJson.repository
            : packageJson.repository?.url;

        if (!repoUrl) {
            return res.status(400).json({ error: 'No repository URL in package.json.' });
        }

        // Извлекаем owner/repo из URL
        const match = repoUrl.match(/github\.com[\/:](.+?)\/(.+?)(\.git)?$/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid GitHub repository URL.' });
        }

        const [, owner, repoName] = match;
        const cleanRepoName = repoName.replace('.git', '');

        const octokit = new Octokit({ auth: token });

        // Получаем latest tag
        let latestTag = null;
        try {
            const { data: tags } = await octokit.repos.listTags({
                owner,
                repo: cleanRepoName,
                per_page: 1
            });
            if (tags.length > 0) {
                latestTag = tags[0].name;
            }
        } catch (error) {
            console.warn('[Plugin IDE] Could not fetch tags:', error.message);
        }

        if (!latestTag) {
            return res.status(400).json({ error: 'Plugin must have at least one release tag.' });
        }

        // Сохраняем иконку в package.json если её там нет
        if (!packageJson.botpanel) {
            packageJson.botpanel = {};
        }

        if (!packageJson.botpanel.icon) {
            packageJson.botpanel.icon = icon;
            await fse.writeJson(packageJsonPath, packageJson, { spaces: 2 });
            console.log(`[Plugin IDE] Saved icon "${icon}" to package.json`);
        }

        // Берём категории, зависимости и supportedHosts из package.json
        const categories = packageJson.botpanel?.categories || [];
        const supportedHosts = packageJson.botpanel?.supportedHosts || [];
        const dependencies = packageJson.botpanel?.dependencies || [];

        // Формируем entry для официального списка
        const pluginEntry = {
            id: cleanRepoName,
            name: pluginDisplayName,
            author: packageJson.author || owner,
            description: packageJson.description || '',
            repoUrl: repoUrl.replace('.git', ''),
            icon: icon,
            latestTag: latestTag,
            categories: categories,
            supportedHosts: supportedHosts,
            dependencies: dependencies
        };

        // Работаем с official-plugins-list репозиторием
        const listOwner = 'blockmineJS';
        const listRepo = 'official-plugins-list';

        console.log(`[Plugin IDE] Creating PR for plugin ${cleanRepoName} in official list`);

        // Получаем default branch (main или master)
        const { data: repoInfo } = await octokit.repos.get({
            owner: listOwner,
            repo: listRepo
        });
        const defaultBranch = repoInfo.default_branch;

        // Получаем SHA основной ветки
        const { data: refData } = await octokit.git.getRef({
            owner: listOwner,
            repo: listRepo,
            ref: `heads/${defaultBranch}`
        });
        const baseSha = refData.object.sha;

        // Получаем текущий index.json для проверки, существует ли плагин
        const { data: fileData } = await octokit.repos.getContent({
            owner: listOwner,
            repo: listRepo,
            path: 'index.json',
            ref: defaultBranch
        });

        const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
        const pluginsList = JSON.parse(currentContent);

        // Проверяем, не добавлен ли уже плагин
        const existingPlugin = pluginsList.find(p => p.id === cleanRepoName);
        const isUpdate = !!existingPlugin;
        const oldVersion = existingPlugin?.latestTag;

        // Название ветки зависит от типа операции
        const branchName = isUpdate ? `update-plugin-${cleanRepoName}` : `add-plugin-${cleanRepoName}`;

        // Проверяем, существует ли уже ветка с таким именем
        let branchExists = false;
        try {
            await octokit.git.getRef({
                owner: listOwner,
                repo: listRepo,
                ref: `heads/${branchName}`
            });
            branchExists = true;
        } catch (error) {
            // Ветка не существует, это нормально
        }

        // Если ветка существует, удаляем её
        if (branchExists) {
            try {
                await octokit.git.deleteRef({
                    owner: listOwner,
                    repo: listRepo,
                    ref: `heads/${branchName}`
                });
                console.log(`[Plugin IDE] Deleted existing branch ${branchName}`);
            } catch (error) {
                console.warn('[Plugin IDE] Could not delete existing branch:', error.message);
            }
        }

        // Создаем новую ветку
        await octokit.git.createRef({
            owner: listOwner,
            repo: listRepo,
            ref: `refs/heads/${branchName}`,
            sha: baseSha
        });

        // Обновляем или добавляем плагин в список
        const existingIndex = pluginsList.findIndex(p => p.id === cleanRepoName);
        if (existingIndex !== -1) {
            // Обновляем существующий
            pluginsList[existingIndex] = pluginEntry;
        } else {
            // Добавляем новый
            pluginsList.push(pluginEntry);
        }

        // Сортируем по id для консистентности
        pluginsList.sort((a, b) => a.id.localeCompare(b.id));

        const newContent = JSON.stringify(pluginsList, null, 2) + '\n';

        // Создаем коммит с обновленным index.json
        const { data: blob } = await octokit.git.createBlob({
            owner: listOwner,
            repo: listRepo,
            content: Buffer.from(newContent).toString('base64'),
            encoding: 'base64'
        });

        const { data: baseCommit } = await octokit.git.getCommit({
            owner: listOwner,
            repo: listRepo,
            commit_sha: baseSha
        });

        const { data: tree } = await octokit.git.createTree({
            owner: listOwner,
            repo: listRepo,
            tree: [
                {
                    path: 'index.json',
                    mode: '100644',
                    type: 'blob',
                    sha: blob.sha
                }
            ],
            base_tree: baseCommit.tree.sha
        });

        // Commit message и PR body зависят от типа операции
        const commitMessage = isUpdate
            ? `Update ${pluginDisplayName} to ${latestTag}`
            : `Add ${pluginDisplayName} plugin`;

        const { data: commit } = await octokit.git.createCommit({
            owner: listOwner,
            repo: listRepo,
            message: commitMessage,
            tree: tree.sha,
            parents: [baseSha]
        });

        await octokit.git.updateRef({
            owner: listOwner,
            repo: listRepo,
            ref: `heads/${branchName}`,
            sha: commit.sha
        });

        // Создаем Pull Request
        const prTitle = isUpdate
            ? `🔄 Update ${pluginDisplayName} to ${latestTag}`
            : `✨ Add ${pluginDisplayName} plugin`;

        const prBody = isUpdate
            ? `## Обновление плагина: ${pluginDisplayName}

**ID**: \`${cleanRepoName}\`
**Автор**: ${packageJson.author || owner}
**Описание**: ${packageJson.description || 'Нет описания'}
**Репозиторий**: ${repoUrl.replace('.git', '')}
**Старая версия**: ${oldVersion}
**Новая версия**: ${latestTag}

---

Этот PR был автоматически создан из BlockMine IDE.

### Что нужно проверить:
- [ ] Новая версия работает корректно
- [ ] Обновленные данные плагина корректны
- [ ] Заполнены \`categories\`, \`supportedHosts\`, \`dependencies\` (если нужно)
- [ ] Иконка отображается корректно
`
            : `## Новый плагин: ${pluginDisplayName}

**ID**: \`${cleanRepoName}\`
**Автор**: ${packageJson.author || owner}
**Описание**: ${packageJson.description || 'Нет описания'}
**Репозиторий**: ${repoUrl.replace('.git', '')}
**Версия**: ${latestTag}

---

Этот PR был автоматически создан из BlockMine IDE.

### Что нужно проверить:
- [ ] Плагин работает
- [ ] Описание корректно
- [ ] Заполнены \`categories\`, \`supportedHosts\`, \`dependencies\` (если нужно)
- [ ] Иконка отображается корректно
`;

        let prUrl;
        let prNumber;

        try {
            const { data: pr } = await octokit.pulls.create({
                owner: listOwner,
                repo: listRepo,
                title: prTitle,
                head: branchName,
                base: defaultBranch,
                body: prBody
            });
            prUrl = pr.html_url;
            prNumber = pr.number;
        } catch (error) {
            // Возможно PR уже существует
            if (error.status === 422) {
                // Ищем существующий PR
                const { data: pulls } = await octokit.pulls.list({
                    owner: listOwner,
                    repo: listRepo,
                    head: `${listOwner}:${branchName}`,
                    state: 'open'
                });

                if (pulls.length > 0) {
                    prUrl = pulls[0].html_url;
                    prNumber = pulls[0].number;
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }

        res.json({
            success: true,
            prUrl,
            prNumber,
            message: 'Pull Request created successfully'
        });

    } catch (error) {
        console.error(`[Plugin IDE Error] /submit-to-official-list:`, error);
        res.status(500).json({
            error: error.message || 'Failed to create Pull Request.'
        });
    }
});

module.exports = router; 