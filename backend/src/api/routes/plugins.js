const express = require('express');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const { pluginManager } = require('../../core/services');

const prisma = new PrismaClient();
const OFFICIAL_CATALOG_URL = "https://raw.githubusercontent.com/blockmineJS/official-plugins-list/main/index.json";
const CATALOG_TTL_MS = 5 * 60 * 1000;
const PLUGIN_DETAIL_TTL_MS = 10 * 60 * 1000;

let catalogCache = {
    data: null,
    expiresAt: 0,
    pending: null,
};

const pluginDetailCache = new Map();
const GITHUB_REQUEST_TIMEOUT_MS = 10000;

function getGithubHeaders(extra = {}) {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'BlockMine',
        ...extra
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchOfficialCatalog(force = false) {
    const now = Date.now();

    if (!force && catalogCache.data && catalogCache.expiresAt > now) {
        return catalogCache.data;
    }

    if (catalogCache.pending) {
        return catalogCache.pending;
    }

    catalogCache.pending = (async () => {
        const response = await fetch(OFFICIAL_CATALOG_URL);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API Error] Failed to fetch catalog from GitHub. Status: ${response.status}, Response: ${errorText}`);
            throw new Error(`GitHub returned status ${response.status}`);
        }

        const data = await response.json();
        catalogCache = {
            data,
            expiresAt: Date.now() + CATALOG_TTL_MS,
            pending: null,
        };
        return data;
    })();

    try {
        return await catalogCache.pending;
    } catch (error) {
        catalogCache.pending = null;
        throw error;
    }
}

function getCachedPluginDetail(pluginName) {
    const cached = pluginDetailCache.get(pluginName);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        pluginDetailCache.delete(pluginName);
        return null;
    }
    return cached.data;
}

function setCachedPluginDetail(pluginName, data) {
    pluginDetailCache.set(pluginName, {
        data,
        expiresAt: Date.now() + PLUGIN_DETAIL_TTL_MS,
    });
}

async function fetchGithubReadme(owner, repo) {
    const readmeUrls = [
        `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/readme.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/readme.md`,
    ];

    for (const url of readmeUrls) {
        const readmeResponse = await fetchWithTimeout(url, { headers: getGithubHeaders() });
        if (readmeResponse.ok) {
            return readmeResponse.text();
        }
    }

    return null;
}

async function renderGithubMarkdown(markdown, owner, repo) {
    if (!markdown) {
        return null;
    }

    const response = await fetchWithTimeout('https://api.github.com/markdown', {
        method: 'POST',
        headers: getGithubHeaders({
            'Accept': 'text/html',
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            text: markdown,
            mode: 'gfm',
            context: `${owner}/${repo}`
        })
    });

    if (!response.ok) {
        if (response.status === 403) {
            const remaining = response.headers.get('x-ratelimit-remaining');
            if (remaining === '0') {
                console.warn(`[GitHub Markdown] Rate limit reached while rendering ${owner}/${repo}.`);
            }
        }
        return null;
    }

    return response.text();
}


router.get('/catalog', async (req, res) => {
    try {
        res.json(await fetchOfficialCatalog());
    } catch (error) {
        console.error(`[API Error] Could not fetch catalog URL. Reason: ${error.message}`);
        res.status(500).json({ error: 'Не удалось загрузить каталог плагинов.' });
    }
});

router.post('/check-updates/:botId', authenticateUniversal, authorize('plugin:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        
        const catalog = await fetchOfficialCatalog();

        const updates = await pluginManager.checkForUpdates(botId, catalog);
        res.json(updates);
    } catch (error) {
        console.error("[API Error] /check-updates:", error);
        res.status(500).json({ error: 'Не удалось проверить обновления.' });
    }
});

router.post('/update/:pluginId', authenticateUniversal, authorize('plugin:update'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const { targetTag } = req.body; // Получаем тег из тела запроса (если указан)
        const updatedPlugin = await pluginManager.updatePlugin(pluginId, targetTag, req.body?.targetRepoUrl);
        res.json(updatedPlugin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/clear-data', authenticateUniversal, authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.id);
        await pluginManager.clearPluginData(pluginId);
        res.status(200).json({ message: 'Данные плагина успешно очищены.' });
    } catch (error) {
        console.error(`[API Error] /plugins/:id/clear-data:`, error);
        res.status(500).json({ error: error.message || 'Не удалось очистить данные плагина.' });
    }
});

router.post('/:id/reload', authenticateUniversal, authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.id);
        const updatedPlugin = await pluginManager.reloadLocalPlugin(pluginId);
        res.status(200).json({
            message: 'Плагин перезагружен, настройки сброшены.',
            plugin: updatedPlugin
        });
    } catch (error) {
        console.error(`[API Error] /plugins/:id/reload:`, error);
        res.status(500).json({ error: error.message || 'Не удалось перезагрузить плагин.' });
    }
});

router.get('/:id/info', authenticateUniversal, authorize('plugin:list'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.id);
        
        const plugin = await prisma.installedPlugin.findUnique({
            where: { id: pluginId },
            select: {
                id: true,
                name: true,
                version: true,
                description: true,
                sourceType: true,
                sourceUri: true,
                sourceRefType: true,
                sourceRef: true,
                isEnabled: true,
                manifest: true,
                settings: true,
                createdAt: true,
                commands: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        isEnabled: true,
                        isVisual: true,
                        owner: true
                    }
                },
                eventGraphs: {
                    select: {
                        id: true,
                        name: true,
                        isEnabled: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });

        if (!plugin) {
            return res.status(404).json({ error: 'Плагин не найден.' });
        }

        res.json(plugin);
    } catch (error) {
        console.error(`[API Error] /plugins/:id/info:`, error);
        res.status(500).json({ error: 'Не удалось получить информацию о плагине.' });
    }
});

router.get('/bot/:botId', authenticateUniversal, authorize('plugin:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        
        const plugins = await prisma.installedPlugin.findMany({
            where: { botId },
            select: {
                id: true,
                name: true,
                version: true,
                description: true,
                sourceType: true,
                sourceUri: true,
                sourceRefType: true,
                sourceRef: true,
                isEnabled: true,
                manifest: true,
                settings: true,
                createdAt: true,
                commands: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        isEnabled: true,
                        isVisual: true,
                        owner: true
                    }
                },
                eventGraphs: {
                    select: {
                        id: true,
                        name: true,
                        isEnabled: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json(plugins);
    } catch (error) {
        console.error(`[API Error] /plugins/bot/:botId:`, error);
        res.status(500).json({ error: 'Не удалось получить список плагинов.' });
    }
});

router.get('/catalog/:name', async (req, res) => {
    try {
        const pluginName = req.params.name;
        const cachedDetail = getCachedPluginDetail(pluginName);

        if (cachedDetail) {
            return res.json(cachedDetail);
        }

        const catalog = await fetchOfficialCatalog();
        const pluginInfo = catalog.find(p => p.name === pluginName);

        if (!pluginInfo) {
            return res.status(404).json({ error: 'Плагин с таким именем не найден в каталоге.' });
        }

        let readmeContent = pluginInfo.description || 'Описание для этого плагина не предоставлено.';
        let readmeHtml = null;

        try {
            const urlParts = new URL(pluginInfo.repoUrl);
            const pathParts = urlParts.pathname.split('/').filter(p => p);

            if (pathParts.length >= 2) {
                const owner = pathParts[0];
                const repo = pathParts[1].replace('.git', '');

                const fetchedReadme = await fetchGithubReadme(owner, repo);
                if (fetchedReadme) {
                    readmeContent = fetchedReadme;
                    readmeHtml = await renderGithubMarkdown(fetchedReadme, owner, repo);
                }
            }
        } catch (readmeError) {
            console.error(`[API] Не удалось загрузить README для ${pluginName}:`, readmeError.message);
        }

        const finalPluginData = {
            ...pluginInfo,
            fullDescription: readmeContent,
            readmeHtml
        };

        setCachedPluginDetail(pluginName, finalPluginData);
        res.json(finalPluginData);
    } catch (error) {
        console.error(`[API Error] /catalog/:name :`, error);
        res.status(500).json({ error: 'Не удалось загрузить данные плагина.' });
    }
});

router.get('/bot/:botId/:pluginName/store', authenticateUniversal, authorize('plugin:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;

        const storeData = await prisma.pluginDataStore.findMany({
            where: {
                botId,
                pluginName
            },
            select: {
                key: true,
                value: true,
                createdAt: true,
                updatedAt: true
            }
        });

        const result = {};
        storeData.forEach(item => {
            try {
                result[item.key] = JSON.parse(item.value);
            } catch (e) {
                result[item.key] = item.value;
            }
        });

        res.json(result);
    } catch (error) {
        console.error(`[API Error] GET /plugins/bot/:botId/:pluginName/store:`, error);
        res.status(500).json({ error: 'Не удалось получить данные store плагина.' });
    }
});

router.get('/bot/:botId/:pluginName/store/:key', authenticateUniversal, authorize('plugin:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;
        const key = req.params.key;

        const storeItem = await prisma.pluginDataStore.findUnique({
            where: {
                pluginName_botId_key: {
                    pluginName,
                    botId,
                    key
                }
            },
            select: {
                value: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!storeItem) {
            return res.status(404).json({ error: 'Ключ не найден в store.' });
        }

        let parsedValue;
        try {
            parsedValue = JSON.parse(storeItem.value);
        } catch (e) {
            parsedValue = storeItem.value;
        }

        res.json({
            key,
            value: parsedValue,
            createdAt: storeItem.createdAt,
            updatedAt: storeItem.updatedAt
        });
    } catch (error) {
        console.error(`[API Error] GET /plugins/bot/:botId/:pluginName/store/:key:`, error);
        res.status(500).json({ error: 'Не удалось получить значение из store.' });
    }
});

router.put('/bot/:botId/:pluginName/store/:key', authenticateUniversal, authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;
        const key = req.params.key;
        const { value } = req.body;

        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        const storeItem = await prisma.pluginDataStore.upsert({
            where: {
                pluginName_botId_key: {
                    pluginName,
                    botId,
                    key
                }
            },
            update: {
                value: stringValue
            },
            create: {
                pluginName,
                botId,
                key,
                value: stringValue
            }
        });

        res.json({
            key,
            value: value,
            updatedAt: storeItem.updatedAt
        });
    } catch (error) {
        console.error(`[API Error] PUT /plugins/bot/:botId/:pluginName/store/:key:`, error);
        res.status(500).json({ error: 'Не удалось сохранить значение в store.' });
    }
});

router.delete('/bot/:botId/:pluginName/store/:key', authenticateUniversal, authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;
        const key = req.params.key;

        await prisma.pluginDataStore.delete({
            where: {
                pluginName_botId_key: {
                    pluginName,
                    botId,
                    key
                }
            }
        });

        res.json({ message: 'Значение удалено из store.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Ключ не найден в store.' });
        }
        console.error(`[API Error] DELETE /plugins/bot/:botId/:pluginName/store/:key:`, error);
        res.status(500).json({ error: 'Не удалось удалить значение из store.' });
    }
});

module.exports = router;
