const express = require('express');
const router = express.Router({ mergeParams: true });
const path = require('path');
const fse = require('fs-extra');
const { OpenRouterClient, MemoryHistoryStorage } = require('openrouter-kit');
const { GeminiClient } = require('google-ai-kit');
const { PrismaClient } = require('@prisma/client');
const Diff = require('diff');

const prisma = new PrismaClient();
const { botManager } = require('../../core/services');

// Хранилище истории чатов в памяти: Map<"botId_pluginName", messages[]>
const chatHistoryStore = new Map();

const MAX_HISTORY_MESSAGES = 300;

/**
 * Обрезает историю сообщений до MAX_HISTORY_MESSAGES (защита от memory leak)
 * @param {Array} history - Массив сообщений
 * @param {string} chatKey - Ключ чата для логирования
 */
function trimHistory(history, chatKey) {
    if (history.length > MAX_HISTORY_MESSAGES) {
        history.splice(0, history.length - MAX_HISTORY_MESSAGES);
        console.log(`[AI Chat] History trimmed to ${MAX_HISTORY_MESSAGES} messages for ${chatKey}`);
    }
}

const rateLimitStore = new Map();
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Очистка устаревших записей каждые 5 минут (защита от утечки памяти)
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Проверка rate limit для AI запросов
 * @param {string} key - Ключ (например, "botId_pluginName")
 * @returns {boolean} - true если запрос разрешен, false если превышен лимит
 */
function checkRateLimit(key) {
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW_MS
        });
        return true;
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    record.count += 1;
    return true;
}

/**
 * Получить оставшееся время до сброса rate limit (в секундах)
 */
function getRateLimitResetTime(key) {
    const record = rateLimitStore.get(key);
    if (!record) return 0;

    const now = Date.now();
    const remaining = Math.max(0, record.resetTime - now);
    return Math.ceil(remaining / 1000);
}

/**
 * Простое форматирование JS кода
 * - Нормализует line endings (CRLF -> LF)
 * - Убирает trailing whitespace
 * - Обеспечивает newline в конце файла
 * - Убирает множественные пустые строки (оставляет максимум 2)
 */
function simpleFormatCode(content, filePath) {
    // Только для JS файлов
    if (!filePath.endsWith('.js') && !filePath.endsWith('.mjs') && !filePath.endsWith('.cjs')) {
        return content;
    }

    let formatted = content;
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');

    formatted = formatted.replace(/\n{4,}/g, '\n\n\n');

    if (!formatted.endsWith('\n')) {
        formatted += '\n';
    }

    return formatted;
}

/**
 * Конвертирует JSON Schema параметры в формат Gemini
 */
function convertToGeminiParameters(jsonSchemaParams) {
    if (!jsonSchemaParams || !jsonSchemaParams.properties) {
        return {
            type: 'OBJECT',
            properties: {},
            required: []
        };
    }

    const convertType = (type) => {
        const typeMap = {
            'string': 'STRING',
            'number': 'NUMBER',
            'integer': 'INTEGER',
            'boolean': 'BOOLEAN',
            'object': 'OBJECT',
            'array': 'ARRAY'
        };
        return typeMap[type] || 'STRING';
    };

    const convertedProperties = {};
    for (const [key, value] of Object.entries(jsonSchemaParams.properties)) {
        convertedProperties[key] = {
            type: convertType(value.type),
            description: value.description || ''
        };

        if (value.enum) {
            convertedProperties[key].enum = value.enum;
        }
    }

    return {
        type: 'OBJECT',
        properties: convertedProperties,
        required: jsonSchemaParams.required || []
    };
}

/**
 * Парсит строку прокси формата "login:password@ip:port"
 * Возвращает объект конфигурации прокси или null если строка пустая
 */
function parseProxyString(proxyString) {
    if (!proxyString || proxyString.trim() === '') {
        return null;
    }

    try {
        // Формат: login:password@ip:port
        const atIndex = proxyString.lastIndexOf('@');
        if (atIndex === -1) {
            console.warn('Invalid proxy format: missing @ separator');
            return null;
        }

        const auth = proxyString.substring(0, atIndex);
        const hostPort = proxyString.substring(atIndex + 1);

        const colonAuthIndex = auth.indexOf(':');
        if (colonAuthIndex === -1) {
            console.warn('Invalid proxy format: missing : in auth');
            return null;
        }

        const user = auth.substring(0, colonAuthIndex);
        const pass = auth.substring(colonAuthIndex + 1);

        const colonHostIndex = hostPort.lastIndexOf(':');
        if (colonHostIndex === -1) {
            console.warn('Invalid proxy format: missing : in host:port');
            return null;
        }

        const host = hostPort.substring(0, colonHostIndex);
        const port = hostPort.substring(colonHostIndex + 1);

        return {
            host: host,
            port: parseInt(port, 10),
            user: user,
            pass: pass
        };
    } catch (error) {
        console.error('Error parsing proxy string:', error);
        return null;
    }
}

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

/**
 * Строгая проверка безопасности пути (защита от path traversal)
 * @param {string} basePath - Базовая директория (например, pluginPath)
 * @param {string} userPath - Путь от пользователя
 * @returns {string|null} - Безопасный абсолютный путь или null если небезопасно
 */
function validateSafePath(basePath, userPath) {
    // Проверяем что userPath не пустой
    if (!userPath || typeof userPath !== 'string') {
        return null;
    }

    // Проверяем на опасные символы
    if (userPath.includes('\0') || userPath.includes('\x00')) {
        return null;
    }

    // Нормализуем пути
    const normalizedBase = path.normalize(basePath);
    const resolvedPath = path.resolve(basePath, userPath);
    const normalizedResolved = path.normalize(resolvedPath);

    // Проверяем что путь начинается с базового пути
    // Используем path.relative чтобы проверить что файл внутри базовой директории
    const relativePath = path.relative(normalizedBase, normalizedResolved);

    // Если relative path начинается с '..' или является абсолютным, значит файл вне базовой директории
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return null;
    }

    return normalizedResolved;
}

function shouldIgnore(filePath, ignoreList) {
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

        // Валидация botId (защита от SQL Injection)
        const botIdNum = parseInt(botId, 10);
        if (isNaN(botIdNum) || botIdNum <= 0 || botIdNum.toString() !== botId) {
            return res.status(400).json({ error: 'Invalid bot ID.' });
        }

        if (!pluginName) {
            return res.status(400).json({ error: 'Имя плагина обязательно в пути.' });
        }

        // Валидация pluginName (защита от path traversal в имени)
        if (pluginName.includes('..') || pluginName.includes('/') || pluginName.includes('\\')) {
            return res.status(400).json({ error: 'Invalid plugin name.' });
        }

        const plugin = await prisma.installedPlugin.findFirst({
            where: {
                botId: botIdNum,
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
        req.botIdNum = botIdNum; // Сохраняем валидированный botId
        next();
    } catch (error) {
        console.error('Error in resolvePluginPath:', error);
        res.status(500).json({ error: 'Не удалось определить путь к плагину.' });
    }
}

function createPluginTools(pluginPath, res, botId, applyMode = 'immediate', autoFormat = false) {
    const baseTools = [
        {
            type: 'function',
            function: {
                name: 'getProjectTree',
                description: 'Получает древовидную структуру файлов и папок плагина. Используй это первым делом чтобы увидеть какие файлы есть в проекте.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            execute: async () => {
                console.log('getProjectTree called for path:', pluginPath);
                try {
                    const tree = getTreeStructure(pluginPath, pluginPath, '', IGNORE_LIST);
                    const allFiles = getAllFilesRecursive(pluginPath, pluginPath, [], IGNORE_LIST);
                    console.log('Found files:', allFiles);

                    let result = `Древовидная структура плагина:\n${tree}\n`;
                    result += `\nВсего файлов: ${allFiles.length}`;

                    return result;
                } catch (error) {
                    return `Ошибка при чтении структуры проекта: ${error.message}`;
                }
            }
        },

        {
            type: 'function',
            function: {
                name: 'getFullProjectContext',
                description: 'Получает полную структуру файлов плагина и содержимое ВСЕХ файлов',
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

                    // Ограничения для защиты от переполнения памяти
                    const MAX_FILE_SIZE = 100 * 1024; // 100KB на файл
                    const MAX_TOTAL_SIZE = 1024 * 1024; // 1MB общий размер
                    let totalSize = 0;

                    for (const file of allFiles) {
                        const fullPath = path.join(pluginPath, file);

                        const stats = await fse.stat(fullPath);
                        if (stats.size > MAX_FILE_SIZE) {
                            result += `=== Файл: ${file} === (пропущен: размер ${stats.size} байт превышает лимит ${MAX_FILE_SIZE})\n\n`;
                            continue;
                        }

                        if (totalSize + stats.size > MAX_TOTAL_SIZE) {
                            result += `\n(достигнут лимит размера ответа ${MAX_TOTAL_SIZE} байт, остальные файлы пропущены)\n`;
                            break;
                        }

                        const fileContent = await fse.readFile(fullPath, 'utf8');
                        totalSize += fileContent.length;
                        result += `=== Файл: ${file} ===\n${fileContent}\n\n`;
                    }

                    return result;
                } catch (error) {
                    return `Ошибка при чтении структуры проекта: ${error.message}`;
                }
            }
        },

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
                    // Используем строгую проверку безопасности (защита от path traversal)
                    const safePath = validateSafePath(pluginPath, args.filePath);
                    if (!safePath) {
                        return `Ошибка: Доступ запрещен. Недопустимый путь к файлу.`;
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
                console.log('updateFile called for:', args.filePath, 'applyMode:', applyMode, 'autoFormat:', autoFormat);

                let content = args.content;
                if (autoFormat) {
                    content = simpleFormatCode(content, args.filePath);
                    console.log('Auto-formatted content for:', args.filePath);
                }

                try {
                    // Используем строгую проверку безопасности (защита от path traversal)
                    const safePath = validateSafePath(pluginPath, args.filePath);
                    if (!safePath) {
                        return `Ошибка: Доступ запрещен. Недопустимый путь к файлу.`;
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
                    
                    const newLines = content.split('\n');
                    let linesAdded = 0;
                    let linesRemoved = 0;
                    let changedLineRanges = []; // Массив объектов { start: number, end: number }

                    if (isNewFile) {
                        linesAdded = newLines.length;
                        changedLineRanges = [{ start: 1, end: newLines.length }];
                    } else {
                        const diffResult = Diff.diffLines(oldContent, content);

                        let currentLine = 1;

                        diffResult.forEach(part => {
                            const lineCount = part.count || 0;

                            if (part.added) {
                                linesAdded += lineCount;
                                changedLineRanges.push({
                                    start: currentLine,
                                    end: currentLine + lineCount - 1
                                });
                                currentLine += lineCount;
                            } else if (part.removed) {
                                linesRemoved += lineCount;
                            } else {
                                currentLine += lineCount;
                            }
                        });
                    }

                    if (applyMode === 'preview') {
                        const sseEvent = {
                            type: 'file_preview',
                            filePath: args.filePath,
                            newContent: content,
                            oldContent: oldContent,
                            linesAdded,
                            linesRemoved,
                            isNewFile,
                            changedLineRanges
                        };
                        console.log('Sending SSE event file_preview:', {
                            filePath: args.filePath,
                            contentLength: content.length,
                            linesAdded,
                            linesRemoved,
                            isNewFile
                        });
                        res.write(`data: ${JSON.stringify(sseEvent)}\n\n`);

                        if (isNewFile) {
                            return `[ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ] Предложено создание файла "${args.filePath}" (${newLines.length} строк). Файл ЕЩЁ НЕ создан - пользователь должен нажать "Применить" чтобы подтвердить. В своём ответе пользователю скажи что ты ПРЕДЛАГАЕШЬ создать файл и жди его решения. НЕ говори что файл создан.`;
                        } else {
                            return `[ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ] Предложено обновление файла "${args.filePath}" (+${linesAdded} -${linesRemoved} строк). Файл ЕЩЁ НЕ изменён - пользователь должен нажать "Применить" чтобы подтвердить. В своём ответе пользователю скажи что ты ПРЕДЛАГАЕШЬ изменения и жди его решения. НЕ говори что изменения применены.`;
                        }
                    }

                    // Immediate mode - записываем файл сразу
                    await fse.ensureDir(path.dirname(safePath));

                    await fse.writeFile(safePath, content, 'utf8');

                    const sseEvent = {
                        type: 'file_updated',
                        filePath: args.filePath,
                        newContent: content,
                        oldContent: oldContent,
                        linesAdded,
                        linesRemoved,
                        isNewFile,
                        changedLineRanges
                    };
                    console.log('Sending SSE event file_updated:', {
                        filePath: args.filePath,
                        contentLength: content.length,
                        linesAdded,
                        linesRemoved,
                        isNewFile,
                        changedLineRanges
                    });
                    res.write(`data: ${JSON.stringify(sseEvent)}\n\n`);
                    console.log('SSE event sent successfully');

                    if (isNewFile) {
                        return `Создан новый файл "${args.filePath}". Размер: ${content.length} символов (${newLines.length} строк).`;
                    } else {
                        return `Успешно обновлен файл "${args.filePath}". +${linesAdded} -${linesRemoved} строк.`;
                    }
                } catch (error) {
                    console.error('Error in updateFile:', error);
                    return `Ошибка при обновлении файла: ${error.message}`;
                }
            }
        },

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

                    let filteredLogs = logs.slice(-limit);

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
                    // Используем строгую проверку безопасности (защита от path traversal)
                    const safePath = validateSafePath(pluginPath, args.filePath);
                    if (!safePath) {
                        return `Ошибка: Доступ запрещен. Недопустимый путь к файлу.`;
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

        {
            type: 'function',
            function: {
                name: 'searchCode',
                description: 'Ищет текст или регулярное выражение в файлах плагина. Полезно для поиска функций, переменных, использований и паттернов в коде.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Текст или регулярное выражение для поиска'
                        },
                        type: {
                            type: 'string',
                            enum: ['text', 'regex'],
                            description: 'Тип поиска: text (точное совпадение) или regex (регулярное выражение). По умолчанию text.'
                        },
                        filePattern: {
                            type: 'string',
                            description: 'Паттерн файлов для поиска, например "*.js" или "*.json". По умолчанию ищет во всех файлах.'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Максимальное количество результатов (по умолчанию 20, максимум 50)'
                        }
                    },
                    required: ['query']
                }
            },
            execute: async (args) => {
                console.log('searchCode called:', args.query, 'type:', args.type || 'text');
                try {
                    const searchType = args.type || 'text';
                    const maxResults = Math.min(args.maxResults || 20, 50);
                    const filePattern = args.filePattern || '*';

                    const allFiles = getAllFilesRecursive(pluginPath, pluginPath, [], IGNORE_LIST);

                    let filesToSearch = allFiles;
                    if (filePattern !== '*') {
                        // Полное экранирование спецсимволов regex, затем конвертация glob '*' в '.*'
                        const escaped = filePattern
                            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                            .replace(/\*/g, '.*');
                        const patternRegex = new RegExp('^' + escaped + '$');
                        filesToSearch = allFiles.filter(f => patternRegex.test(path.basename(f)));
                    }

                    let searchRegex;
                    try {
                        // Защита от ReDoS: ограничение длины regex паттерна
                        const MAX_REGEX_LENGTH = 100;
                        if (searchType === 'regex') {
                            if (args.query.length > MAX_REGEX_LENGTH) {
                                return `Ошибка: регулярное выражение слишком длинное (максимум ${MAX_REGEX_LENGTH} символов)`;
                            }
                            searchRegex = new RegExp(args.query, 'gi');
                        } else {
                            const escaped = args.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            searchRegex = new RegExp(escaped, 'gi');
                        }
                    } catch (regexError) {
                        return `Ошибка в регулярном выражении: ${regexError.message}`;
                    }

                    const results = [];

                    for (const file of filesToSearch) {
                        if (results.length >= maxResults) break;

                        const fullPath = path.join(pluginPath, file);

                        try {
                            const content = await fse.readFile(fullPath, 'utf8');
                            const lines = content.split('\n');

                            lines.forEach((line, index) => {
                                if (results.length >= maxResults) return;

                                if (searchRegex.test(line)) {
                                    searchRegex.lastIndex = 0;

                                    results.push({
                                        file: file,
                                        line: index + 1,
                                        content: line.trim().substring(0, 200)
                                    });
                                }
                            });
                        } catch (readError) {
                            continue;
                        }
                    }

                    if (results.length === 0) {
                        return `Поиск "${args.query}" не дал результатов в ${filesToSearch.length} файлах.`;
                    }

                    let response = `Найдено ${results.length} совпадений для "${args.query}":\n\n`;

                    results.forEach((r, i) => {
                        response += `${i + 1}. ${r.file}:${r.line}\n   ${r.content}\n\n`;
                    });

                    if (results.length === maxResults) {
                        response += `\n(показаны первые ${maxResults} результатов)`;
                    }

                    return response;
                } catch (error) {
                    console.error('Error in searchCode:', error);
                    return `Ошибка при поиске: ${error.message}`;
                }
            }
        },

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
                    // Используем строгую проверку безопасности (защита от path traversal)
                    const safePath = validateSafePath(pluginPath, args.folderPath);
                    if (!safePath) {
                        return `Ошибка: Доступ запрещен. Недопустимый путь к папке.`;
                    }

                    if (safePath === path.normalize(pluginPath)) {
                        return `Ошибка: Нельзя удалить корневую директорию плагина.`;
                    }

                    if (!await fse.pathExists(safePath)) {
                        return `Ошибка: Папка "${args.folderPath}" не найдена.`;
                    }

                    const stats = await fse.stat(safePath);
                    if (!stats.isDirectory()) {
                        return `Ошибка: "${args.folderPath}" является файлом. Используйте deleteFile для удаления файлов.`;
                    }

                    const items = await fse.readdir(safePath);
                    const itemCount = items.length;

                    await fse.remove(safePath);

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

    return baseTools;
}

/**
 * POST /api/bots/:botId/plugins/ide/:pluginName/ai/chat
 * Отправляет сообщение в AI чат с контекстом плагина
 */
router.post('/chat', resolvePluginPath, async (req, res) => {
    console.log('Route hit! botId:', req.params.botId, 'pluginName:', req.params.pluginName);
    try {
        const { message, provider, apiKey, apiEndpoint, model, history, includeFiles, proxy, applyMode, temperature, maxTokens, customSystemPrompt, aiMode, autoFormat } = req.body;
        const { botId, pluginName } = req.params;

        // Проверка rate limit (защита от злоупотребления)
        const rateLimitKey = `${botId}_${pluginName}`;
        if (!checkRateLimit(rateLimitKey)) {
            const resetTime = getRateLimitResetTime(rateLimitKey);
            console.warn(`[AI Chat] Rate limit exceeded for ${rateLimitKey}. Reset in ${resetTime}s`);
            return res.status(429).json({
                error: 'Превышен лимит запросов к AI. Попробуйте позже.',
                retryAfter: resetTime
            });
        }

        const effectiveApplyMode = applyMode || 'immediate';

        const effectiveAutoFormat = autoFormat === true;

        const effectiveTemperature = temperature !== undefined ? temperature : 0.7;
        const effectiveMaxTokens = maxTokens !== undefined ? maxTokens : 4096;
        console.log('Apply mode:', effectiveApplyMode);

        const aiProvider = provider || 'openrouter';
        console.log('AI Provider:', aiProvider);
        console.log('Proxy config:', proxy);

        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        if (effectiveTemperature < 0 || effectiveTemperature > 2) {
            return res.status(400).json({ error: 'Temperature must be between 0 and 2.' });
        }

        const systemPromptPath = path.join(__dirname, '../../ai/plugin-assistant-system-prompt.md');
        let systemPrompt = 'Ты - AI помощник для разработки плагинов в BlockMine IDE.';

        if (await fse.pathExists(systemPromptPath)) {
            systemPrompt = await fse.readFile(systemPromptPath, 'utf8');
        }

        if (customSystemPrompt && customSystemPrompt.trim()) {
            systemPrompt += `\n\n## Дополнительные инструкции пользователя:\n${customSystemPrompt.trim()}`;
        }

        let context = '';

        const packageJsonPath = path.join(req.pluginPath, 'package.json');
        if (await fse.pathExists(packageJsonPath)) {
            const packageJson = await fse.readJson(packageJsonPath);
            context += `\n\n## Package.json плагина:\n\`\`\`json\n${JSON.stringify(packageJson, null, 2)}\n\`\`\`\n`;
        }

        if (includeFiles && Array.isArray(includeFiles)) {
            for (const fileName of includeFiles) {
                const safePath = validateSafePath(req.pluginPath, fileName);
                if (!safePath) {
                    console.warn(`[AI Chat] Skipping unsafe path: ${fileName}`);
                    continue;
                }
                if (await fse.pathExists(safePath)) {
                    const fileContent = await fse.readFile(safePath, 'utf8');
                    context += `\n\n## Файл ${fileName}:\n\`\`\`javascript\n${fileContent}\n\`\`\`\n`;
                }
            }
        }

        const proxyConfig = parseProxyString(proxy);
        if (proxyConfig) {
            console.log('Using proxy:', `${proxyConfig.user}:***@${proxyConfig.host}:${proxyConfig.port}`);
        }

        let client;
        if (aiProvider === 'google') {
            const googleConfig = {
                apiKeys: [apiKey],
                defaultModel: model
            };

            if (proxyConfig) {
                googleConfig.proxy = proxyConfig;
            }

            client = new GeminiClient(googleConfig);
            console.log('Created Google Gemini client');
        } else {
            // OpenRouter
            const maxToolIterations = 30;

            const clientConfig = {
                apiKey: apiKey,
                model: model,
                historyAdapter: new MemoryHistoryStorage(),
                maxToolCalls: maxToolIterations, 
                debug: false
            };

            if (apiEndpoint && apiEndpoint !== 'https://openrouter.ai/api/v1') {
                clientConfig.apiEndpoint = apiEndpoint;
            }

            if (proxyConfig) {
                clientConfig.proxy = proxyConfig;
            }

            client = new OpenRouterClient(clientConfig);
            console.log('Created OpenRouter client with maxToolCalls:', maxToolIterations);
        }

        const chatKey = `${botId}_${pluginName}`;
        if (!chatHistoryStore.has(chatKey)) {
            chatHistoryStore.set(chatKey, []);
        }
        const storedHistory = chatHistoryStore.get(chatKey);

        const customMessages = [
            {
                role: 'system',
                content: systemPrompt + context
            }
        ];

        customMessages.push(...storedHistory);

        const userMessage = {
            role: 'user',
            content: message
        };
        customMessages.push(userMessage);

        storedHistory.push(userMessage);

        // Ограничиваем размер истории (защита от memory leak)
        trimHistory(storedHistory, chatKey);

        const pluginTools = createPluginTools(
            req.pluginPath,
            res,
            botId,
            effectiveApplyMode,
            effectiveAutoFormat
        );
        console.log('AutoFormat:', effectiveAutoFormat, 'Tools count:', pluginTools.length);

        let fullResponse = '';
        let assistantMessage = { role: 'assistant', content: '' };

        if (aiProvider === 'google') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            try {
                console.log('[Google] Converting history...');
                const geminiHistory = [];
                storedHistory.forEach(msg => {
                    if (msg.role === 'user') {
                        geminiHistory.push({ role: 'user', parts: [{ text: msg.content }] });
                    } else if (msg.role === 'assistant') {
                        geminiHistory.push({ role: 'model', parts: [{ text: msg.content }] });
                    }
                });
                console.log('[Google] History length:', geminiHistory.length);

                console.log('[Google] Converting tools...');
                const geminiTools = [{
                    functionDeclarations: pluginTools.map(tool => ({
                        name: tool.function.name,
                        description: tool.function.description,
                        parameters: convertToGeminiParameters(tool.function.parameters),
                        execute: async (args) => {
                            if (!res.writableEnded) {
                                res.write(`data: ${JSON.stringify({
                                    type: 'tool_call',
                                    toolName: tool.function.name,
                                    args
                                })}\n\n`);
                            }

                            const result = await tool.execute(args);

                            if (!res.writableEnded) {
                                res.write(`data: ${JSON.stringify({
                                    type: 'tool_result',
                                    toolName: tool.function.name,
                                    result
                                })}\n\n`);
                            }

                            return result;
                        }
                    }))
                }];
                console.log('[Google] Converted', geminiTools[0].functionDeclarations.length, 'tools');

                const maxToolIterations = 30;
                console.log('[Google] Creating chat... maxToolCalls:', maxToolIterations);
                const chat = client.chats.create({
                    systemInstruction: systemPrompt + context,
                    history: geminiHistory,
                    tools: geminiTools,
                    maxToolCalls: maxToolIterations
                });

                console.log('[Google] Sending message...');
                const response = await chat.sendMessage(message);
                const content = response.text();
                console.log('[Google] Response received, length:', content.length);


                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
                    res.write(`data: ${JSON.stringify({ type: 'done', fullResponse: content })}\n\n`);
                }

                assistantMessage.content = content;
                storedHistory.push(assistantMessage);

                // Ограничиваем размер истории (защита от memory leak)
                trimHistory(storedHistory, chatKey);

                console.log('[Google] Closing SSE stream');
                res.end();
                return;
            } catch (error) {
                console.error('[Google AI Error]:', error);
                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
                    res.end();
                }
                return;
            }
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            console.log(`Using temperature: ${effectiveTemperature}, maxTokens: ${effectiveMaxTokens}`);
            await client.chatStream({
                customMessages: customMessages,
                temperature: effectiveTemperature,
                maxTokens: effectiveMaxTokens,
                tools: pluginTools,
                includeToolResultInReport: true,
                streamCallbacks: {
                    onToolCallExecuting: (toolName, args) => {
                        console.log(`Executing tool: ${toolName}`, args);
                        res.write(`data: ${JSON.stringify({ type: 'tool_call', toolName, args })}\n\n`);
                    },
                    onToolCallResult: (toolName, result) => {
                        console.log(`Tool result: ${toolName}`, typeof result === 'string' ? result.substring(0, 100) : result);
                        res.write(`data: ${JSON.stringify({ type: 'tool_result', toolName, result })}\n\n`);
                    },
                    onContent: (content) => {
                        assistantMessage.content += content;
                        res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
                    },
                    onComplete: (fullContent, usage) => {
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

            if (assistantMessage.content) {
                storedHistory.push(assistantMessage);

                trimHistory(storedHistory, chatKey);

                console.log(`Saved to history. Total messages: ${storedHistory.length}`);
            }

            console.log('Stream completed, closing connection');
            res.end();

        } catch (streamError) {
            console.error('[AI Assistant Streaming Error]:', streamError);
            if (!res.headersSent) {
                res.status(500).json({ error: streamError.message });
            } else if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message })}\n\n`);
                res.end();
            }
        }

    } catch (error) {
        console.error('[AI Assistant Error]:', error);

        if (!res.headersSent) {
            res.status(500).json({
                error: error.message || 'Failed to process AI request.'
            });
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
            res.end();
        }
    }
});

/**
 * POST /api/bots/:botId/plugins/ide/:pluginName/ai/inline
 * Inline AI запрос (для командной палитры в редакторе)
 */
router.post('/inline', resolvePluginPath, async (req, res) => {
    try {
        const { prompt, systemInstruction, action, context, provider, apiKey, apiEndpoint, model, proxy, temperature, maxTokens } = req.body;
        const { botId, pluginName } = req.params;

        const rateLimitKey = `${botId}_${pluginName}_inline`;
        if (!checkRateLimit(rateLimitKey)) {
            const resetTime = getRateLimitResetTime(rateLimitKey);
            console.warn(`[AI Inline] Rate limit exceeded for ${rateLimitKey}. Reset in ${resetTime}s`);
            return res.status(429).json({
                error: 'Превышен лимит запросов к AI. Попробуйте позже.',
                retryAfter: resetTime
            });
        }

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        const aiProvider = provider || 'openrouter';
        const proxyConfig = parseProxyString(proxy);

        const effectiveTemperature = temperature !== undefined ? temperature : 0.7;
        const effectiveMaxTokens = maxTokens !== undefined ? Math.min(maxTokens, 4096) : 2048;

        if (effectiveTemperature < 0 || effectiveTemperature > 2) {
            return res.status(400).json({ error: 'Temperature must be between 0 and 2.' });
        }

        let client;
        if (aiProvider === 'google') {
            const googleConfig = {
                apiKeys: [apiKey],
                defaultModel: model
            };
            if (proxyConfig) {
                googleConfig.proxy = proxyConfig;
            }
            client = new GeminiClient(googleConfig);
        } else {
            const clientConfig = {
                apiKey: apiKey,
                model: model,
                historyAdapter: new MemoryHistoryStorage()
            };
            if (apiEndpoint && apiEndpoint !== 'https://openrouter.ai/api/v1') {
                clientConfig.apiEndpoint = apiEndpoint;
            }
            if (proxyConfig) {
                clientConfig.proxy = proxyConfig;
            }
            client = new OpenRouterClient(clientConfig);
        }

        let result;

        if (aiProvider === 'google') {
            const chat = client.chats.create({
                systemInstruction: systemInstruction || 'Ты - AI помощник для разработчиков. Отвечай кратко и по делу.'
            });
            const response = await chat.sendMessage(prompt);
            result = response.text();
        } else {
            const response = await client.chat({
                customMessages: [
                    { role: 'system', content: systemInstruction || 'Ты - AI помощник для разработчиков. Отвечай кратко и по делу.' },
                    { role: 'user', content: prompt }
                ],
                temperature: effectiveTemperature,
                maxTokens: effectiveMaxTokens
            });
            result = response;
        }

        console.log('[AI Inline] Response generated for action:', action);
        res.json({ result, action });

    } catch (error) {
        console.error('[AI Inline Error]:', error);
        res.status(500).json({ error: error.message || 'Failed to process inline AI request' });
    }
});

/**
 * POST /api/bots/:botId/plugins/ide/:pluginName/ai/apply-change
 * Применяет preview изменение (записывает файл на диск)
 */
router.post('/apply-change', resolvePluginPath, async (req, res) => {
    try {
        const { filePath, content } = req.body;
        const { botId, pluginName } = req.params;

        const rateLimitKey = `${botId}_${pluginName}_apply`;
        if (!checkRateLimit(rateLimitKey)) {
            const resetTime = getRateLimitResetTime(rateLimitKey);
            console.warn(`[AI Apply] Rate limit exceeded for ${rateLimitKey}. Reset in ${resetTime}s`);
            return res.status(429).json({
                error: 'Превышен лимит запросов к AI. Попробуйте позже.',
                retryAfter: resetTime
            });
        }

        if (!filePath || content === undefined) {
            return res.status(400).json({ error: 'filePath and content are required' });
        }

        // Используем строгую проверку безопасности (защита от path traversal)
        const safePath = validateSafePath(req.pluginPath, filePath);
        if (!safePath) {
            return res.status(403).json({ error: 'Access denied. Invalid file path.' });
        }

        await fse.ensureDir(path.dirname(safePath));

        await fse.writeFile(safePath, content, 'utf8');

        console.log('[AI] Applied preview change:', filePath);

        res.json({ success: true, filePath });
    } catch (error) {
        console.error('[AI] Error applying change:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/bots/:botId/plugins/ide/:pluginName/ai/chat
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
