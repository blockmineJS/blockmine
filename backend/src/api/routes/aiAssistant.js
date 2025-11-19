const express = require('express');
const router = express.Router({ mergeParams: true });
const path = require('path');
const fse = require('fs-extra');
const { OpenRouterClient, MemoryHistoryStorage } = require('openrouter-kit');
const { PrismaClient } = require('@prisma/client');
const Diff = require('diff');

const prisma = new PrismaClient();
const { botManager } = require('../../core/services');

// Хранилище истории чатов в памяти: Map<"botId_pluginName", messages[]>
const chatHistoryStore = new Map();

// Список игнорируемых файлов/папок для сканирования проекта
const IGNORE_LIST = [
    'node_modules/',
    'package-lock.json',
    '.git/',
    '.vscode/',
    '.idea/',
    '*.log',
    '*.db',
    'dist/',
    '.env',
    'coverage/',
    '.claude/'
];

// Вспомогательная функция для проверки игнорирования
function shouldIgnore(filePath, ignoreList) {
    // Нормализуем путь к forward slashes для кроссплатформенности
    const normalizedPath = filePath.replace(/\\/g, '/');

    return ignoreList.some(pattern => {
        if (pattern.endsWith('/')) {
            const dirPattern = pattern.slice(0, -1);
            const pathParts = normalizedPath.split('/');
            return pathParts.includes(dirPattern) || normalizedPath.startsWith(pattern) || normalizedPath === dirPattern;
        }
        if (pattern.startsWith('*.')) {
            const extension = pattern.substring(1);
            return normalizedPath.endsWith(extension);
        }
        const fileName = path.basename(normalizedPath);
        return normalizedPath === pattern ||
               normalizedPath.startsWith(pattern + '/') ||
               fileName === pattern;
    });
}

// Получить все файлы рекурсивно
function getAllFilesRecursive(dir, basePath = dir, fileList = [], ignoreList = []) {
    const files = fse.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(basePath, fullPath);

        if (shouldIgnore(relativePath, ignoreList)) {
            return;
        }

        if (fse.statSync(fullPath).isDirectory()) {
            getAllFilesRecursive(fullPath, basePath, fileList, ignoreList);
        } else {
            fileList.push(relativePath);
        }
    });

    return fileList;
}

// Получить древовидную структуру
function getTreeStructure(dir, basePath = dir, prefix = '', ignoreList = []) {
    const files = fse.readdirSync(dir);
    let result = '';

    files.forEach((file, index) => {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(basePath, fullPath);

        if (shouldIgnore(relativePath, ignoreList)) {
            return;
        }

        const isLast = index === files.length - 1;
        const connector = isLast ? '└── ' : '├── ';

        if (fse.statSync(fullPath).isDirectory()) {
            result += `${prefix}${connector}${file}/\n`;
            result += getTreeStructure(fullPath, basePath, prefix + (isLast ? '    ' : '│   '), ignoreList);
        } else {
            result += `${prefix}${connector}${file}\n`;
        }
    });

    return result;
}

// Debug middleware
router.use((req, res, next) => {
    console.log('[AI Assistant Router] Request:', req.method, req.path, 'Params:', req.params);
    next();
});

/**
 * Middleware для проверки плагина
 */
async function resolvePluginPath(req, res, next) {
    try {
        console.log('resolvePluginPath - botId:', req.params.botId, 'pluginName:', req.params.pluginName);
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
            console.log('Plugin not found in database');
            return res.status(404).json({ error: 'Плагин не найден в базе данных.' });
        }

        const pluginPath = plugin.path;
        console.log('Checking plugin path:', pluginPath);

        if (!await fse.pathExists(pluginPath)) {
            console.log('Plugin path NOT found in filesystem!');
            return res.status(404).json({ error: 'Директория плагина не найдена в файловой системе.' });
        }

        console.log('Plugin path found, proceeding to route handler');
        req.pluginPath = pluginPath;
        next();
    } catch (error) {
        console.error('Error in resolvePluginPath:', error);
        res.status(500).json({ error: 'Не удалось определить путь к плагину.' });
    }
}

// Создаем tools для AI ассистента
function createPluginTools(pluginPath, res, botId) {
    return [
        // Tool 1: Получить полный контекст проекта
        {
            type: 'function',
            function: {
                name: 'getFullProjectContext',
                description: 'Получает полную структуру файлов плагина и содержимое всех файлов (кроме игнорируемых)',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            execute: async () => {
                console.log('getFullProjectContext called for path:', pluginPath);
                try {
                    const tree = getTreeStructure(pluginPath, pluginPath, '', IGNORE_LIST);
                    const allFiles = getAllFilesRecursive(pluginPath, pluginPath, [], IGNORE_LIST);
                    console.log('Found files:', allFiles);

                    let result = `Древовидная структура плагина:\n${tree}\n\n`;
                    result += `Всего файлов: ${allFiles.length}\n\n`;
                    result += `Содержимое файлов:\n\n`;

                    for (const file of allFiles) {
                        const fullPath = path.join(pluginPath, file);
                        const fileContent = await fse.readFile(fullPath, 'utf8');
                        result += `=== Файл: ${file} ===\n${fileContent}\n\n`;
                    }

                    return result;
                } catch (error) {
                    return `Ошибка при чтении структуры проекта: ${error.message}`;
                }
            }
        },

        // Tool 2: Прочитать конкретный файл
        {
            type: 'function',
            function: {
                name: 'readFile',
                description: 'Читает содержимое конкретного файла из плагина',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: {
                            type: 'string',
                            description: 'Относительный путь к файлу внутри плагина (например: "index.js" или "commands/hello.js")'
                        }
                    },
                    required: ['filePath']
                }
            },
            execute: async (args) => {
                console.log('readFile called with:', args.filePath);
                try {
                    const safePath = path.resolve(pluginPath, args.filePath);

                    // Проверка безопасности - файл должен быть внутри pluginPath
                    if (!safePath.startsWith(pluginPath)) {
                        return `Ошибка: Доступ запрещен. Файл находится за пределами плагина.`;
                    }

                    if (!await fse.pathExists(safePath)) {
                        return `Ошибка: Файл "${args.filePath}" не найден.`;
                    }

                    const content = await fse.readFile(safePath, 'utf8');
                    return `Содержимое файла "${args.filePath}":\n\n${content}`;
                } catch (error) {
                    return `Ошибка при чтении файла: ${error.message}`;
                }
            }
        },

        // Tool 3: Обновить содержимое файла
        {
            type: 'function',
            function: {
                name: 'updateFile',
                description: 'Обновляет содержимое файла в плагине. ВАЖНО: Полностью заменяет содержимое файла новым.',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: {
                            type: 'string',
                            description: 'Относительный путь к файлу внутри плагина (например: "index.js" или "commands/hello.js")'
                        },
                        content: {
                            type: 'string',
                            description: 'Новое содержимое файла (полный текст файла)'
                        }
                    },
                    required: ['filePath', 'content']
                }
            },
            execute: async (args, context) => {
                console.log('updateFile called for:', args.filePath);
                try {
                    const safePath = path.resolve(pluginPath, args.filePath);

                    // Проверка безопасности - файл должен быть внутри pluginPath
                    if (!safePath.startsWith(pluginPath)) {
                        return `Ошибка: Доступ запрещен. Файл находится за пределами плагина.`;
                    }

                    // Читаем старое содержимое для подсчёта diff
                    let oldContent = '';
                    let oldLines = [];
                    let isNewFile = false;

                    if (await fse.pathExists(safePath)) {
                        oldContent = await fse.readFile(safePath, 'utf8');
                        oldLines = oldContent.split('\n');
                    } else {
                        isNewFile = true;
                    }

                    // Создаем директорию если не существует
                    await fse.ensureDir(path.dirname(safePath));

                    // Записываем новое содержимое
                    await fse.writeFile(safePath, args.content, 'utf8');

                    // Вычисляем реальные изменённые строки используя diff
                    const newLines = args.content.split('\n');
                    let linesAdded = 0;
                    let linesRemoved = 0;
                    let changedLineRanges = []; // Массив объектов { start: number, end: number }

                    if (isNewFile) {
                        linesAdded = newLines.length;
                        // Все строки нового файла - это добавленные строки
                        changedLineRanges = [{ start: 1, end: newLines.length }];
                    } else {
                        // Используем библиотеку diff для вычисления изменений
                        const diffResult = Diff.diffLines(oldContent, args.content);

                        let currentLine = 1; // Текущая строка в новом файле

                        diffResult.forEach(part => {
                            const lineCount = part.count || 0;

                            if (part.added) {
                                // Добавленные строки
                                linesAdded += lineCount;
                                changedLineRanges.push({
                                    start: currentLine,
                                    end: currentLine + lineCount - 1
                                });
                                currentLine += lineCount;
                            } else if (part.removed) {
                                // Удалённые строки (не увеличиваем currentLine)
                                linesRemoved += lineCount;
                            } else {
                                // Неизменённые строки
                                currentLine += lineCount;
                            }
                        });
                    }

                    // Отправляем событие на фронтенд для обновления редактора
                    const sseEvent = {
                        type: 'file_updated',
                        filePath: args.filePath,
                        newContent: args.content,
                        oldContent: oldContent,
                        linesAdded,
                        linesRemoved,
                        isNewFile,
                        changedLineRanges // Добавляем точные диапазоны изменённых строк
                    };
                    console.log('Sending SSE event file_updated:', {
                        filePath: args.filePath,
                        contentLength: args.content.length,
                        linesAdded,
                        linesRemoved,
                        isNewFile,
                        changedLineRanges
                    });
                    res.write(`data: ${JSON.stringify(sseEvent)}\n\n`);
                    console.log('SSE event sent successfully');

                    if (isNewFile) {
                        return `Создан новый файл "${args.filePath}". Размер: ${args.content.length} символов (${newLines.length} строк).`;
                    } else {
                        return `Успешно обновлен файл "${args.filePath}". +${linesAdded} -${linesRemoved} строк.`;
                    }
                } catch (error) {
                    console.error('Error in updateFile:', error);
                    return `Ошибка при обновлении файла: ${error.message}`;
                }
            }
        },

        // Tool 4: Прочитать логи бота (чат из игры и console.log)
        {
            type: 'function',
            function: {
                name: 'readBotLogs',
                description: 'Читает логи бота: игровой чат, системные сообщения и console.log от плагинов. Полезно для отладки плагинов.',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'Максимальное количество записей логов (по умолчанию 50, максимум 200)'
                        },
                        filter: {
                            type: 'string',
                            description: 'Фильтр по тексту (опционально). Показывает только логи содержащие этот текст.'
                        }
                    },
                    required: []
                }
            },
            execute: async (args) => {
                console.log('readBotLogs called with:', args);
                try {
                    const limit = Math.min(args.limit || 50, 200);
                    const logs = botManager.getBotLogs(parseInt(botId));

                    if (!logs || logs.length === 0) {
                        return 'Логи бота пусты. Возможно бот ещё не запущен или не было активности.';
                    }

                    // Берём последние N записей
                    let filteredLogs = logs.slice(-limit);

                    // Применяем фильтр если указан
                    if (args.filter) {
                        const filterLower = args.filter.toLowerCase();
                        filteredLogs = filteredLogs.filter(log => {
                            const message = typeof log === 'string' ? log : (log.message || JSON.stringify(log));
                            return message.toLowerCase().includes(filterLower);
                        });
                    }

                    if (filteredLogs.length === 0) {
                        return `Логи не найдены${args.filter ? ` по фильтру "${args.filter}"` : ''}.`;
                    }

                    // Форматируем логи
                    const formattedLogs = filteredLogs.map(log => {
                        if (typeof log === 'string') {
                            return log;
                        } else if (log.timestamp && log.message) {
                            const time = new Date(log.timestamp).toLocaleTimeString('ru-RU');
                            const type = log.type ? `[${log.type}]` : '';
                            return `${time} ${type} ${log.message}`;
                        } else {
                            return JSON.stringify(log);
                        }
                    }).join('\n');

                    return `Последние ${filteredLogs.length} записей логов бота:\n\n${formattedLogs}`;
                } catch (error) {
                    console.error('Error in readBotLogs:', error);
                    return `Ошибка при чтении логов: ${error.message}`;
                }
            }
        },

        // Tool 5: Удалить файл
        {
            type: 'function',
            function: {
                name: 'deleteFile',
                description: 'Удаляет файл из плагина. ВНИМАНИЕ: Операция необратима!',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: {
                            type: 'string',
                            description: 'Относительный путь к файлу внутри плагина (например: "old-file.js" или "temp/cache.json")'
                        }
                    },
                    required: ['filePath']
                }
            },
            execute: async (args) => {
                console.log('deleteFile called for:', args.filePath);
                try {
                    const safePath = path.resolve(pluginPath, args.filePath);

                    // Проверка безопасности - файл должен быть внутри pluginPath
                    if (!safePath.startsWith(pluginPath)) {
                        return `Ошибка: Доступ запрещен. Файл находится за пределами плагина.`;
                    }

                    // Проверяем что путь существует
                    if (!await fse.pathExists(safePath)) {
                        return `Ошибка: Файл "${args.filePath}" не найден.`;
                    }

                    // Проверяем что это файл, а не директория
                    const stats = await fse.stat(safePath);
                    if (stats.isDirectory()) {
                        return `Ошибка: "${args.filePath}" является папкой. Используйте deleteFolder для удаления папок.`;
                    }

                    // Удаляем файл
                    await fse.remove(safePath);

                    // Отправляем событие на фронтенд
                    const sseEvent = {
                        type: 'file_deleted',
                        filePath: args.filePath
                    };
                    res.write(`data: ${JSON.stringify(sseEvent)}\n\n`);

                    return `Файл "${args.filePath}" успешно удалён.`;
                } catch (error) {
                    console.error('Error in deleteFile:', error);
                    return `Ошибка при удалении файла: ${error.message}`;
                }
            }
        },

        // Tool 6: Удалить папку
        {
            type: 'function',
            function: {
                name: 'deleteFolder',
                description: 'Удаляет папку и всё её содержимое из плагина. ВНИМАНИЕ: Операция необратима! Удаляет папку рекурсивно со всеми вложенными файлами и папками.',
                parameters: {
                    type: 'object',
                    properties: {
                        folderPath: {
                            type: 'string',
                            description: 'Относительный путь к папке внутри плагина (например: "temp" или "old-modules/cache")'
                        }
                    },
                    required: ['folderPath']
                }
            },
            execute: async (args) => {
                console.log('deleteFolder called for:', args.folderPath);
                try {
                    const safePath = path.resolve(pluginPath, args.folderPath);

                    // Проверка безопасности - папка должна быть внутри pluginPath
                    if (!safePath.startsWith(pluginPath)) {
                        return `Ошибка: Доступ запрещен. Папка находится за пределами плагина.`;
                    }

                    // Защита от удаления корневой директории плагина
                    if (safePath === pluginPath) {
                        return `Ошибка: Нельзя удалить корневую директорию плагина.`;
                    }

                    // Проверяем что путь существует
                    if (!await fse.pathExists(safePath)) {
                        return `Ошибка: Папка "${args.folderPath}" не найдена.`;
                    }

                    // Проверяем что это директория
                    const stats = await fse.stat(safePath);
                    if (!stats.isDirectory()) {
                        return `Ошибка: "${args.folderPath}" является файлом. Используйте deleteFile для удаления файлов.`;
                    }

                    // Подсчитываем количество файлов и папок внутри
                    const items = await fse.readdir(safePath);
                    const itemCount = items.length;

                    // Удаляем папку рекурсивно
                    await fse.remove(safePath);

                    // Отправляем событие на фронтенд
                    const sseEvent = {
                        type: 'folder_deleted',
                        folderPath: args.folderPath
                    };
                    res.write(`data: ${JSON.stringify(sseEvent)}\n\n`);

                    return `Папка "${args.folderPath}" успешно удалена (содержала ${itemCount} элементов).`;
                } catch (error) {
                    console.error('Error in deleteFolder:', error);
                    return `Ошибка при удалении папки: ${error.message}`;
                }
            }
        }
    ];
}

/**
 * POST /api/bots/:botId/plugins/ide/:pluginName/ai/chat
 * Отправляет сообщение в AI чат с контекстом плагина
 */
router.post('/chat', resolvePluginPath, async (req, res) => {
    console.log('Route hit! botId:', req.params.botId, 'pluginName:', req.params.pluginName);
    try {
        const { message, apiKey, apiEndpoint, model, history, includeFiles } = req.body;
        const { botId, pluginName } = req.params;

        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        // Читаем системную инструкцию
        const systemPromptPath = path.join(__dirname, '../../ai/plugin-assistant-system-prompt.md');
        let systemPrompt = 'Ты - AI помощник для разработки плагинов в BlockMine IDE.';

        if (await fse.pathExists(systemPromptPath)) {
            systemPrompt = await fse.readFile(systemPromptPath, 'utf8');
        }

        // Собираем контекст плагина
        let context = '';

        // Добавляем package.json
        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        if (await fse.pathExists(packageJsonPath)) {
            const packageJson = await fse.readJson(packageJsonPath);
            context += `\n\n## Package.json плагина:\n\`\`\`json\n${JSON.stringify(packageJson, null, 2)}\n\`\`\`\n`;
        }

        // Добавляем файлы если запрошено
        if (includeFiles && Array.isArray(includeFiles)) {
            for (const fileName of includeFiles) {
                const filePath = path.join(req.pluginPath, fileName);
                if (await fse.pathExists(filePath)) {
                    const fileContent = await fse.readFile(filePath, 'utf8');
                    context += `\n\n## Файл ${fileName}:\n\`\`\`javascript\n${fileContent}\n\`\`\`\n`;
                }
            }
        }

        // Создаем клиент OpenRouter
        const clientConfig = {
            apiKey: apiKey,
            defaultModel: model || 'openrouter/sherlock-think-alpha',
            historyAdapter: new MemoryHistoryStorage(),
        };

        // Добавляем кастомный endpoint если указан
        if (apiEndpoint && apiEndpoint !== 'https://openrouter.ai/api/v1') {
            clientConfig.baseURL = apiEndpoint;
        }

        const client = new OpenRouterClient(clientConfig);

        // Получаем или создаем историю для этого бота и плагина
        const chatKey = `${botId}_${pluginName}`;
        if (!chatHistoryStore.has(chatKey)) {
            chatHistoryStore.set(chatKey, []);
        }
        const storedHistory = chatHistoryStore.get(chatKey);

        // Формируем customMessages
        const customMessages = [
            {
                role: 'system',
                content: systemPrompt + context
            }
        ];

        // Добавляем сохранённую историю
        customMessages.push(...storedHistory);

        // Добавляем текущее сообщение
        const userMessage = {
            role: 'user',
            content: message
        };
        customMessages.push(userMessage);

        // Сохраняем сообщение пользователя в историю
        storedHistory.push(userMessage);

        // Создаем tools для этого плагина
        const pluginTools = createPluginTools(req.pluginPath, res, botId);

        // Устанавливаем заголовки для SSE стриминга
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullResponse = '';
        let assistantMessage = { role: 'assistant', content: '' };

        try {
            // Используем chatStream для streaming
            await client.chatStream({
                customMessages: customMessages,
                temperature: 0.7,
                maxTokens: 4096,
                tools: pluginTools,
                includeToolResultInReport: true,
                streamCallbacks: {
                    onToolCallExecuting: (toolName, args) => {
                        console.log(`Executing tool: ${toolName}`, args);
                        res.write(`data: ${JSON.stringify({ type: 'tool_call', toolName, args })}\n\n`);
                    },
                    onToolCallResult: (toolName, result) => {
                        console.log(`Tool result: ${toolName}`, typeof result === 'string' ? result.substring(0, 100) : result);

                        // Отправляем tool_result для обновления UI карточки
                        res.write(`data: ${JSON.stringify({ type: 'tool_result', toolName, result })}\n\n`);
                    },
                    onContent: (content) => {
                        assistantMessage.content += content;
                        res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
                    },
                    onComplete: (fullContent, usage) => {
                        // НЕ закрываем соединение здесь, т.к. могут быть еще tool calls
                        fullResponse = fullContent;
                        assistantMessage.content = fullContent;
                        res.write(`data: ${JSON.stringify({ type: 'done', fullResponse: fullContent })}\n\n`);
                    },
                    onError: (error) => {
                        console.error('[AI Assistant Stream Error]:', error);
                        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
                        res.end();
                    }
                }
            });

            // Сохраняем ответ ассистента в историю
            if (assistantMessage.content) {
                storedHistory.push(assistantMessage);
                console.log(`Saved to history. Total messages: ${storedHistory.length}`);
            }

            // Закрываем соединение после полного завершения (включая все tool calls)
            console.log('Stream completed, closing connection');
            res.end();

        } catch (streamError) {
            console.error('[AI Assistant Streaming Error]:', streamError);
            if (!res.headersSent) {
                res.status(500).json({ error: streamError.message });
            } else {
                res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message })}\n\n`);
                res.end();
            }
        }

    } catch (error) {
        console.error('[AI Assistant Error]:', error);

        // Если заголовки еще не отправлены, отправляем JSON ошибку
        if (!res.headersSent) {
            res.status(500).json({
                error: error.message || 'Failed to process AI request.'
            });
        } else {
            // Если стриминг уже начался, отправляем ошибку через SSE
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
            res.end();
        }
    }
});

/**
 * GET /api/bots/:botId/plugins/ide/:pluginName/ai/chat
 * Получает историю чата для конкретного бота и плагина
 */
router.get('/chat', resolvePluginPath, async (req, res) => {
    try {
        const { botId } = req.params;
        const pluginName = req.params.pluginName;
        const chatKey = `${botId}_${pluginName}`;

        console.log('GET chat - botId:', botId, 'pluginName:', pluginName, 'chatKey:', chatKey);

        const history = chatHistoryStore.get(chatKey) || [];
        console.log(`Loading history for ${chatKey}: ${history.length} messages`);

        res.json({ history });
    } catch (error) {
        console.error('Error loading history:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/bots/:botId/plugins/ide/:pluginName/ai/chat
 * Очищает историю чата для конкретного бота и плагина
 */
router.delete('/chat', resolvePluginPath, async (req, res) => {
    try {
        const { botId, pluginName } = req.params;

        console.log('Clear history request for:', { botId, pluginName });

        const chatKey = `${botId}_${pluginName}`;

        if (chatHistoryStore.has(chatKey)) {
            const messageCount = chatHistoryStore.get(chatKey).length;
            chatHistoryStore.delete(chatKey);
            console.log(`Cleared ${messageCount} messages from history`);
            res.json({ success: true, cleared: messageCount });
        } else {
            console.log('No history found to clear');
            res.json({ success: true, cleared: 0 });
        }
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
