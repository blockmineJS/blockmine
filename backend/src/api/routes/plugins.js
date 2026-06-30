const express = require('express');
const prisma = require('../../lib/prisma');
const { authenticateUniversal, authorize } = require('../middleware/auth');
const { checkBotAccess, checkPluginBotAccess } = require('../middleware/botAccess');
const { pluginManager } = require('../../core/services');
const {
    tryParseGithubRepoUrl,
    fetchGithubReadme,
    renderGithubMarkdown,
    fetchLatestGithubReleaseBody,
} = require('../../core/utils/github');
const TtlCache = require('../../core/utils/ttlCache');
const { filterSecretSettings, parseManifest, isGroupedSettings } = require('../../core/utils/pluginSettings');

const router = express.Router();
const OFFICIAL_CATALOG_URL = 'https://raw.githubusercontent.com/blockmineJS/official-plugins-list/main/index.json';
const CATALOG_TTL_MS = 5 * 60 * 1000;
const PLUGIN_DETAIL_TTL_MS = 10 * 60 * 1000;
const PLUGIN_CHANGELOG_TTL_MS = 10 * 60 * 1000;
const CATALOG_FETCH_TIMEOUT_MS = 10000;

const pluginDetailCache = new TtlCache({ ttlMs: PLUGIN_DETAIL_TTL_MS, cleanupIntervalMs: 5 * 60 * 1000, maxSize: 500 });
const pluginChangelogCache = new TtlCache({ ttlMs: PLUGIN_CHANGELOG_TTL_MS, cleanupIntervalMs: 5 * 60 * 1000, maxSize: 500 });

let catalogCache = { data: null, expiresAt: 0, pending: null };

async function fetchOfficialCatalog(force = false) {
    const now = Date.now();
    if (!force && catalogCache.data && catalogCache.expiresAt > now) {
        return catalogCache.data;
    }
    if (catalogCache.pending) return catalogCache.pending;

    catalogCache.pending = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CATALOG_FETCH_TIMEOUT_MS);
        try {
            const response = await fetch(OFFICIAL_CATALOG_URL, { signal: controller.signal });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[API Error] Failed to fetch catalog from GitHub. Status: ${response.status}, Response: ${errorText}`);
                throw new Error(`GitHub returned status ${response.status}`);
            }
            const data = await response.json();
            catalogCache.data = data;
            catalogCache.expiresAt = Date.now() + CATALOG_TTL_MS;
            return data;
        } finally {
            clearTimeout(timeoutId);
        }
    })();

    try {
        return await catalogCache.pending;
    } catch (error) {
        catalogCache.data = null;
        catalogCache.expiresAt = 0;
        throw error;
    } finally {
        catalogCache.pending = null;
    }
}

function maskStoreValues(plugin, raw) {
    const manifest = parseManifest(plugin);
    const manifestStore = manifest.store || null;
    if (!manifestStore || typeof manifestStore !== 'object') return raw;

    const result = { ...raw };
    for (const key of Object.keys(manifestStore)) {
        if (manifestStore[key]?.secret === true && key in result) {
            result[key] = '********';
        }
    }
    return result;
}

router.get('/catalog', async (req, res) => {
    try {
        res.json(await fetchOfficialCatalog());
    } catch (error) {
        console.error(`[API Error] Could not fetch catalog URL. Reason: ${error.message}`);
        if (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('timed out')) {
            return res.json([]);
        }
        res.status(500).json({ error: 'Не удалось загрузить каталог плагинов.' });
    }
});

router.post('/check-updates/:botId', authenticateUniversal, checkBotAccess, authorize('plugin:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const catalog = await fetchOfficialCatalog();
        const updates = await pluginManager.checkForUpdates(botId, catalog);
        res.json(updates);
    } catch (error) {
        console.error('[API Error] /check-updates:', error);
        res.status(500).json({ error: 'Не удалось проверить обновления.' });
    }
});

router.post('/update/:pluginId', authenticateUniversal, authorize('plugin:update'), checkPluginBotAccess({ pluginIdParam: 'pluginId' }), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const { targetTag, targetRepoUrl } = req.body || {};
        const updatedPlugin = await pluginManager.updatePlugin(pluginId, targetTag, targetRepoUrl);
        res.json(updatedPlugin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/clear-data', authenticateUniversal, authorize('plugin:settings:edit'), checkPluginBotAccess(), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.id);
        await pluginManager.clearPluginData(pluginId);
        res.status(200).json({ message: 'Данные плагина успешно очищены.' });
    } catch (error) {
        console.error(`[API Error] /plugins/:id/clear-data:`, error);
        res.status(500).json({ error: error.message || 'Не удалось очистить данные плагина.' });
    }
});

router.post('/:id/reload', authenticateUniversal, authorize('plugin:settings:edit'), checkPluginBotAccess(), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.id);
        const updatedPlugin = await pluginManager.reloadLocalPlugin(pluginId);
        res.status(200).json({ message: 'Плагин перезагружен, настройки сброшены.', plugin: updatedPlugin });
    } catch (error) {
        console.error(`[API Error] /plugins/:id/reload:`, error);
        res.status(500).json({ error: error.message || 'Не удалось перезагрузить плагин.' });
    }
});

router.get('/:id/info', authenticateUniversal, authorize('plugin:list'), checkPluginBotAccess(), async (req, res) => {
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
                    select: { id: true, name: true, description: true, isEnabled: true, isVisual: true, owner: true },
                },
                eventGraphs: {
                    select: { id: true, name: true, isEnabled: true, createdAt: true, updatedAt: true },
                },
            },
        });

        if (!plugin) {
            return res.status(404).json({ error: 'Плагин не найден.' });
        }

        const manifest = parseManifest(plugin);
        const manifestSettings = manifest.settings || {};
        let safePlugin = plugin;
        if (plugin.settings) {
            try {
                const parsed = JSON.parse(plugin.settings);
                const filtered = filterSecretSettings(parsed, manifestSettings, isGroupedSettings(manifestSettings));
                safePlugin = { ...plugin, settings: JSON.stringify(filtered) };
            } catch (e) {
                console.warn(`[API] Не удалось распарсить settings плагина ${plugin.name}: ${e.message}`);
            }
        }

        res.json(safePlugin);
    } catch (error) {
        console.error(`[API Error] /plugins/:id/info:`, error);
        res.status(500).json({ error: 'Не удалось получить информацию о плагине.' });
    }
});

router.get('/bot/:botId', authenticateUniversal, checkBotAccess, authorize('plugin:list'), async (req, res) => {
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
                    select: { id: true, name: true, description: true, isEnabled: true, isVisual: true, owner: true },
                },
                eventGraphs: {
                    select: { id: true, name: true, isEnabled: true, createdAt: true, updatedAt: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        const safePlugins = plugins.map((plugin) => {
            const manifest = parseManifest(plugin);
            const manifestSettings = manifest.settings || {};
            if (!plugin.settings) return plugin;
            try {
                const parsed = JSON.parse(plugin.settings);
                const filtered = filterSecretSettings(parsed, manifestSettings, isGroupedSettings(manifestSettings));
                return { ...plugin, settings: JSON.stringify(filtered) };
            } catch {
                return plugin;
            }
        });

        res.json(safePlugins);
    } catch (error) {
        console.error(`[API Error] /plugins/bot/:botId:`, error);
        res.status(500).json({ error: 'Не удалось получить список плагинов.' });
    }
});

router.get('/catalog/:name/changelog', async (req, res) => {
    try {
        const pluginName = req.params.name;
        const cached = pluginChangelogCache.get(pluginName);
        if (cached !== null) {
            return res.json({ body: cached });
        }

        const catalog = await fetchOfficialCatalog();
        const pluginInfo = catalog.find((plugin) => plugin.name === pluginName);
        if (!pluginInfo) {
            return res.status(404).json({ error: 'Plugin not found in catalog.' });
        }

        const changelogBody = (await fetchLatestGithubReleaseBody(pluginInfo.repoUrl)) || '';
        pluginChangelogCache.set(pluginName, changelogBody);
        return res.json({ body: changelogBody });
    } catch (error) {
        console.error(`[API Error] /catalog/:name/changelog:`, error);
        return res.status(500).json({ error: 'Failed to load plugin changelog.' });
    }
});

router.get('/catalog/:name', async (req, res) => {
    try {
        const pluginName = req.params.name;
        const cached = pluginDetailCache.get(pluginName);
        if (cached) {
            return res.json(cached);
        }

        const catalog = await fetchOfficialCatalog();
        const pluginInfo = catalog.find((p) => p.name === pluginName);
        if (!pluginInfo) {
            return res.status(404).json({ error: 'Плагин с таким именем не найден в каталоге.' });
        }

        let readmeContent = pluginInfo.description || 'Описание для этого плагина не предоставлено.';
        let readmeHtml = null;

        const repoInfo = tryParseGithubRepoUrl(pluginInfo.repoUrl);
        if (repoInfo) {
            try {
                const fetchedReadme = await fetchGithubReadme(repoInfo.owner, repoInfo.repo);
                if (fetchedReadme) {
                    readmeContent = fetchedReadme;
                    readmeHtml = await renderGithubMarkdown(fetchedReadme, repoInfo.owner, repoInfo.repo);
                }
            } catch (readmeError) {
                console.error(`[API] Не удалось загрузить README для ${pluginName}:`, readmeError.message);
            }
        }

        const finalPluginData = { ...pluginInfo, fullDescription: readmeContent, readmeHtml };
        pluginDetailCache.set(pluginName, finalPluginData);
        res.json(finalPluginData);
    } catch (error) {
        console.error(`[API Error] /catalog/:name :`, error);
        res.status(500).json({ error: 'Не удалось загрузить данные плагина.' });
    }
});

async function loadPluginForRequest(req, res, next) {
    try {
        const botId = parseInt(req.params.botId, 10);
        const pluginName = req.params.pluginName;
        if (isNaN(botId) || !pluginName) {
            return res.status(400).json({ error: 'Некорректные параметры.' });
        }
        const plugin = await prisma.installedPlugin.findFirst({
            where: { botId, name: pluginName },
            select: { id: true, manifest: true },
        });
        if (!plugin) {
            return res.status(404).json({ error: 'Плагин не найден.' });
        }
        req.targetPluginInfo = plugin;
        next();
    } catch (e) {
        console.error('[plugins/store] loadPluginForRequest error', e);
        res.status(500).json({ error: 'Ошибка получения плагина.' });
    }
}

router.get('/bot/:botId/:pluginName/store', authenticateUniversal, checkBotAccess, authorize('plugin:list'), loadPluginForRequest, async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;
        const storeData = await prisma.pluginDataStore.findMany({
            where: { botId, pluginName },
            select: { key: true, value: true, createdAt: true, updatedAt: true },
        });
        const result = {};
        storeData.forEach((item) => {
            try {
                result[item.key] = JSON.parse(item.value);
            } catch {
                result[item.key] = item.value;
            }
        });

        const safe = maskStoreValues(req.targetPluginInfo, result);
        res.json(safe);
    } catch (error) {
        console.error(`[API Error] GET /plugins/bot/:botId/:pluginName/store:`, error);
        res.status(500).json({ error: 'Не удалось получить данные store плагина.' });
    }
});

router.get('/bot/:botId/:pluginName/store/:key', authenticateUniversal, checkBotAccess, authorize('plugin:list'), loadPluginForRequest, async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;
        const key = req.params.key;

        const storeItem = await prisma.pluginDataStore.findUnique({
            where: { pluginName_botId_key: { pluginName, botId, key } },
            select: { value: true, createdAt: true, updatedAt: true },
        });
        if (!storeItem) {
            return res.status(404).json({ error: 'Ключ не найден в store.' });
        }

        let parsedValue;
        try {
            parsedValue = JSON.parse(storeItem.value);
        } catch {
            parsedValue = storeItem.value;
        }

        const wrapped = maskStoreValues(req.targetPluginInfo, { [key]: parsedValue });
        res.json({ key, value: wrapped[key], createdAt: storeItem.createdAt, updatedAt: storeItem.updatedAt });
    } catch (error) {
        console.error(`[API Error] GET /plugins/bot/:botId/:pluginName/store/:key:`, error);
        res.status(500).json({ error: 'Не удалось получить значение из store.' });
    }
});

router.put('/bot/:botId/:pluginName/store/:key', authenticateUniversal, checkBotAccess, authorize('plugin:settings:edit'), loadPluginForRequest, async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;
        const key = req.params.key;
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({ error: 'Поле value обязательно.' });
        }

        let stringValue;
        if (typeof value === 'string') {
            stringValue = value;
        } else {
            try {
                stringValue = JSON.stringify(value);
            } catch (e) {
                return res.status(400).json({ error: 'Значение нельзя сериализовать в JSON.' });
            }
        }
        if (stringValue === undefined) {
            return res.status(400).json({ error: 'Недопустимое значение.' });
        }

        const storeItem = await prisma.pluginDataStore.upsert({
            where: { pluginName_botId_key: { pluginName, botId, key } },
            update: { value: stringValue },
            create: { pluginName, botId, key, value: stringValue },
        });

        res.json({ key, value, updatedAt: storeItem.updatedAt });
    } catch (error) {
        console.error(`[API Error] PUT /plugins/bot/:botId/:pluginName/store/:key:`, error);
        res.status(500).json({ error: 'Не удалось сохранить значение в store.' });
    }
});

router.delete('/bot/:botId/:pluginName/store/:key', authenticateUniversal, checkBotAccess, authorize('plugin:settings:edit'), loadPluginForRequest, async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const pluginName = req.params.pluginName;
        const key = req.params.key;

        await prisma.pluginDataStore.delete({
            where: { pluginName_botId_key: { pluginName, botId, key } },
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
